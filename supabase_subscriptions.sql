-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 3: planes y cobro recurrente
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_signup.sql (Fase 2)
--
--  Modelo: mensualidad fija por plan.
--  El plan define el precio Y los limites (sucursales, modulos),
--  asi el cliente que crece sube de plan solo.
--
--  Distincion importante:
--  supabase_payments.sql cobra PEDIDOS de comensales (un cargo,
--  una vez). Esto cobra SUSCRIPCIONES de restaurantes (un cargo
--  cada mes, automatico). Comparten credenciales de MercadoPago
--  pero son flujos distintos.
--
--  Regla de oro, igual que en pedidos: el navegador nunca decide
--  si algo esta pagado. Solo el webhook, que verifica contra la
--  API de MercadoPago, puede activar una suscripcion.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Catalogo de planes ────────────────────────────────
create table if not exists plans (
  code          text primary key,
  name          text not null,
  price         numeric(10,2) not null,
  currency      text not null default 'MXN',
  -- Limites. -1 = sin limite.
  max_branches  integer not null default 1,
  max_menu_items integer not null default -1,
  max_users     integer not null default 2,
  -- Modulos que habilita
  has_inventory boolean not null default false,
  has_orders    boolean not null default true,
  has_custom_domain boolean not null default false,
  sort_order    integer not null default 0,
  active        boolean not null default true
);

insert into plans (code, name, price, max_branches, max_users,
                   has_inventory, has_custom_domain, sort_order) values
  ('basic', 'Básico',  899,  1,  2, false, false, 1),
  ('pro',   'Pro',    1799,  3,  8, true,  true,  2),
  ('max',   'Ilimitado', 3499, -1, -1, true, true, 3)
on conflict (code) do update set
  name = excluded.name,
  price = excluded.price,
  max_branches = excluded.max_branches,
  max_users = excluded.max_users,
  has_inventory = excluded.has_inventory,
  has_custom_domain = excluded.has_custom_domain,
  sort_order = excluded.sort_order;

alter table plans enable row level security;

-- Los precios son publicos: se muestran antes de registrarse.
drop policy if exists "Anyone reads plans" on plans;
create policy "Anyone reads plans" on plans
  for select using (true);

drop policy if exists "Platform writes plans" on plans;
create policy "Platform writes plans" on plans
  for all using (is_platform()) with check (is_platform());

-- tenants.plan pasa a apuntar al catalogo.
update tenants set plan = 'basic'
  where plan not in (select code from plans);

alter table tenants drop constraint if exists tenants_plan_fkey;
alter table tenants add constraint tenants_plan_fkey
  foreign key (plan) references plans(code);

-- ── 2. La suscripcion ────────────────────────────────────
create table if not exists subscriptions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  plan          text not null references plans(code),

  status        text not null default 'pending'
                  check (status in ('pending','authorized','paused','cancelled')),

  -- Identificadores de MercadoPago. preapproval = suscripcion.
  mp_preapproval_id text unique,
  mp_payer_email    text,

  -- Ciclo vigente
  current_period_end timestamptz,
  amount        numeric(10,2) not null,
  currency      text not null default 'MXN',

  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz
);

create index if not exists subscriptions_tenant_idx on subscriptions (tenant_id);
create index if not exists subscriptions_status_idx on subscriptions (status);

-- Una empresa no puede tener dos suscripciones vivas a la vez.
create unique index if not exists subscriptions_one_live
  on subscriptions (tenant_id)
  where status in ('pending','authorized');

-- ── 3. Cobros individuales ───────────────────────────────
--  Cada mes que MercadoPago cobra deja una fila aqui. Sirve de
--  historial para el cliente y de conciliacion para ustedes.
create table if not exists subscription_payments (
  id            uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  mp_payment_id text not null unique,
  amount        numeric(10,2) not null,
  status        text not null,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists sub_payments_tenant_idx
  on subscription_payments (tenant_id, created_at desc);

-- ── 4. RLS ───────────────────────────────────────────────
alter table subscriptions         enable row level security;
alter table subscription_payments enable row level security;

-- El dueno ve su suscripcion; nadie la escribe desde el navegador:
-- eso lo hace el webhook con service_role.
drop policy if exists "Owner reads own subscription" on subscriptions;
create policy "Owner reads own subscription" on subscriptions
  for select using (is_platform() or (reaches_tenant(tenant_id) and is_owner()));

drop policy if exists "Owner reads own payments" on subscription_payments;
create policy "Owner reads own payments" on subscription_payments
  for select using (is_platform() or (reaches_tenant(tenant_id) and is_owner()));

-- Sin politicas de insert/update: las tablas solo se escriben con
-- service_role desde las Edge Functions, que salta RLS.

-- ── 5. Limites del plan ──────────────────────────────────
--  El plan no es solo precio: define cuanto puede crecer el cliente.
create or replace function tenant_limits(p_tenant uuid)
returns table (
  plan_code text,
  plan_name text,
  branches_used integer,
  branches_max integer,
  users_used integer,
  users_max integer,
  menu_used integer,
  menu_max integer,
  has_inventory boolean,
  has_custom_domain boolean
)
language sql stable security definer set search_path = public
as $$
  select
    p.code, p.name,
    (select count(*)::int from branches   b where b.tenant_id = p_tenant),
    p.max_branches,
    (select count(*)::int from profiles   u where u.tenant_id = p_tenant),
    p.max_users,
    (select count(*)::int from menu_items m where m.tenant_id = p_tenant),
    p.max_menu_items,
    p.has_inventory,
    p.has_custom_domain
  from tenants t
  join plans p on p.code = t.plan
  where t.id = p_tenant;
$$;

-- Impide pasarse del limite de sucursales del plan.
create or replace function enforce_branch_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  limite integer;
  usadas integer;
begin
  select p.max_branches into limite
  from tenants t join plans p on p.code = t.plan
  where t.id = new.tenant_id;

  -- -1 = sin limite. Sin plan resuelto, no se bloquea.
  if limite is null or limite < 0 then return new; end if;

  select count(*) into usadas from branches where tenant_id = new.tenant_id;

  if usadas >= limite then
    raise exception 'Tu plan permite % % . Cambia de plan para agregar mas.',
      limite, case when limite = 1 then 'sucursal' else 'sucursales' end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_branch_limit on branches;
create trigger trg_enforce_branch_limit
  before insert on branches
  for each row execute function enforce_branch_limit();

-- ── 6. Estado de cuenta de la empresa ────────────────────
--  Lo que el panel del dueno necesita saber en una sola consulta.
create or replace view tenant_billing as
select
  t.id            as tenant_id,
  t.name,
  t.status,
  t.trial_ends_at,
  greatest(0, extract(day from t.trial_ends_at - now())::int) as trial_days_left,
  p.code          as plan_code,
  p.name          as plan_name,
  p.price         as plan_price,
  p.currency,
  s.id            as subscription_id,
  s.status        as subscription_status,
  s.current_period_end,
  s.mp_preapproval_id,
  (select count(*) from subscription_payments sp
    where sp.tenant_id = t.id and sp.status = 'approved') as payments_made
from tenants t
join plans p on p.code = t.plan
left join subscriptions s
  on s.tenant_id = t.id and s.status in ('pending','authorized');

-- ── 7. Cambio de plan ────────────────────────────────────
--  Solo cambia el plan elegido. El cobro lo activa el webhook:
--  elegir un plan no lo deja pagado.
create or replace function choose_plan(p_plan text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  my uuid := my_tenant();
  limite integer;
  usadas integer;
begin
  if my is null or not is_owner() then
    raise exception 'Solo el dueno puede cambiar el plan';
  end if;

  if not exists (select 1 from plans where code = p_plan and active) then
    raise exception 'Plan invalido: %', p_plan;
  end if;

  -- Bajar de plan no debe dejar sucursales fuera de limite.
  select max_branches into limite from plans where code = p_plan;
  select count(*) into usadas from branches where tenant_id = my;

  if limite >= 0 and usadas > limite then
    raise exception 'Tienes % sucursales y ese plan permite %. Elimina sucursales primero.',
      usadas, limite;
  end if;

  update tenants set plan = p_plan where id = my;
end;
$$;

revoke all on function choose_plan(text) from public;
grant execute on function choose_plan(text) to authenticated;

-- ── 8. Suspension por falta de pago ──────────────────────
--  Corre a diario (pg_cron). Suspende pruebas vencidas y
--  suscripciones que dejaron de pagarse.
create or replace function run_billing_cycle()
returns table (suspended integer, reactivated integer)
language plpgsql security definer set search_path = public
as $$
declare
  s integer := 0;
  r integer := 0;
begin
  -- Prueba vencida sin suscripcion viva.
  update tenants t
    set status = 'suspended'
    where t.status = 'trial'
      and t.trial_ends_at < now()
      and not exists (
        select 1 from subscriptions x
        where x.tenant_id = t.id and x.status = 'authorized'
      );
  get diagnostics s = row_count;

  -- Suscripcion vencida hace mas de 3 dias: periodo de gracia.
  update tenants t
    set status = 'suspended'
    where t.status = 'active'
      and exists (
        select 1 from subscriptions x
        where x.tenant_id = t.id
          and x.status = 'authorized'
          and x.current_period_end < now() - interval '3 days'
      );

  -- Al dia otra vez: vuelve a activa.
  update tenants t
    set status = 'active'
    where t.status = 'suspended'
      and exists (
        select 1 from subscriptions x
        where x.tenant_id = t.id
          and x.status = 'authorized'
          and x.current_period_end > now()
      );
  get diagnostics r = row_count;

  return query select s, r;
end;
$$;

-- ── 9. VERIFICACION ──────────────────────────────────────
--    select code, name, price, max_branches from plans order by sort_order;
--    select * from tenant_billing;
--    select * from tenant_limits((select id from tenants where slug = 'principal'));
