-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 5: finanzas del negocio
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_platform_create.sql
--
--  Que resuelve:
--  Hasta ahora se sabia que se le cobra a cada cliente, pero no
--  cuanto se gana en total, que cuesta operar, ni que margen
--  queda. Tampoco habia forma de editar los planes desde el panel.
--
--  Aqui se agrega:
--   · Gastos de la plataforma (hosting, dominios, herramientas)
--   · Ingreso recurrente mensual y su evolucion
--   · Margen real: ingresos menos gastos
--   · Cobros vencidos y clientes en riesgo
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Gastos de la plataforma ───────────────────────────
create table if not exists platform_expenses (
  id          uuid primary key default gen_random_uuid(),
  concept     text not null,
  category    text not null default 'Otros'
                check (category in ('Hosting','Dominios','Herramientas','Marketing','Comisiones','Impuestos','Otros')),
  amount      numeric(12,2) not null check (amount >= 0),
  currency    text not null default 'MXN',
  -- true: se repite cada mes (hosting). false: gasto unico.
  recurring   boolean not null default false,
  -- Fecha a la que corresponde el gasto, no cuando se registro.
  incurred_on date not null default current_date,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists platform_expenses_date_idx
  on platform_expenses (incurred_on desc);

alter table platform_expenses enable row level security;

-- Los gastos son del negocio: nadie mas los ve.
drop policy if exists "Platform manages expenses" on platform_expenses;
create policy "Platform manages expenses" on platform_expenses
  for all using (is_platform()) with check (is_platform());

-- ── 2. Ingreso recurrente mensual ────────────────────────
--  Lo que se factura cada mes si nadie cancela. Es la metrica
--  base de un negocio de suscripcion.
create or replace view platform_mrr as
select
  coalesce(sum(p.price), 0) as mrr,
  count(*)::int             as paying_clients,
  coalesce(avg(p.price), 0) as avg_ticket
from tenants t
join plans p on p.code = t.plan
where t.status = 'active';

-- Desglose por plan: donde esta el dinero.
create or replace view platform_mrr_by_plan as
select
  p.code,
  p.name,
  p.price,
  count(t.id)::int as clients,
  (count(t.id) * p.price) as revenue
from plans p
left join tenants t on t.plan = p.code and t.status = 'active'
group by p.code, p.name, p.price, p.sort_order
order by p.sort_order;

-- ── 3. Cobros reales por mes ─────────────────────────────
--  MRR es lo esperado; esto es lo que de verdad entro.
create or replace view platform_revenue_monthly as
select
  date_trunc('month', coalesce(sp.paid_at, sp.created_at))::date as month,
  count(*)::int          as payments,
  coalesce(sum(sp.amount), 0) as collected
from subscription_payments sp
where sp.status = 'approved'
group by 1
order by 1 desc;

-- ── 4. Gastos por mes ────────────────────────────────────
--  Los recurrentes se suman a cada mes desde que se registraron;
--  los unicos, solo al mes que les toca.
create or replace view platform_expenses_monthly as
with meses as (
  select generate_series(
    date_trunc('month', coalesce((select min(incurred_on) from platform_expenses), current_date)),
    date_trunc('month', current_date),
    interval '1 month'
  )::date as month
)
select
  m.month,
  coalesce(sum(
    case
      when e.recurring and date_trunc('month', e.incurred_on) <= m.month then e.amount
      when not e.recurring and date_trunc('month', e.incurred_on) = m.month then e.amount
      else 0
    end
  ), 0) as spent
from meses m
left join platform_expenses e on true
group by m.month
order by m.month desc;

-- ── 5. Estado de resultados ──────────────────────────────
--  Ingresos menos gastos, mes por mes.
create or replace view platform_pnl as
select
  coalesce(r.month, e.month) as month,
  coalesce(r.collected, 0)   as revenue,
  coalesce(e.spent, 0)       as expenses,
  coalesce(r.collected, 0) - coalesce(e.spent, 0) as profit,
  case
    when coalesce(r.collected, 0) > 0
      then round(((coalesce(r.collected, 0) - coalesce(e.spent, 0)) / r.collected) * 100, 1)
    else 0
  end as margin_pct
from platform_revenue_monthly r
full outer join platform_expenses_monthly e on e.month = r.month
order by 1 desc;

-- ── 6. Resumen para el tablero ───────────────────────────
create or replace view platform_summary as
select
  (select mrr from platform_mrr)                          as mrr,
  (select paying_clients from platform_mrr)               as paying_clients,
  (select count(*)::int from tenants
    where status = 'trial' and trial_ends_at > now())     as in_trial,
  (select count(*)::int from tenants
    where status = 'suspended')                           as suspended,
  (select count(*)::int from tenants)                     as total_clients,
  -- Gasto recurrente: el costo fijo de tener la plataforma viva.
  (select coalesce(sum(amount), 0) from platform_expenses
    where recurring)                                      as monthly_costs,
  (select coalesce(sum(collected), 0) from platform_revenue_monthly
    where month = date_trunc('month', current_date)::date) as collected_this_month,
  (select coalesce(sum(amount), 0) from platform_expenses
    where date_trunc('month', incurred_on) = date_trunc('month', current_date)
       or recurring)                                      as spent_this_month;

-- ── 7. Clientes en riesgo ────────────────────────────────
--  A quien hay que llamar esta semana.
create or replace view platform_at_risk as
select
  t.id,
  t.name,
  t.slug,
  t.status,
  t.plan,
  p.price,
  t.trial_ends_at,
  case
    when t.status = 'trial' and t.trial_ends_at < now() then 'Prueba vencida'
    when t.status = 'trial' and t.trial_ends_at < now() + interval '3 days' then 'Prueba por vencer'
    when t.status = 'suspended' then 'Suspendida'
    when s.current_period_end < now() then 'Cobro vencido'
    else null
  end as reason,
  -- Actividad: un cliente que no usa el producto no lo va a pagar.
  (select max(o.created_at) from orders o
    join branches b on b.id = o.branch_id
   where b.tenant_id = t.id) as last_activity
from tenants t
join plans p on p.code = t.plan
left join subscriptions s
  on s.tenant_id = t.id and s.status = 'authorized'
where t.status in ('trial','suspended')
   or s.current_period_end < now()
order by t.trial_ends_at;

-- ── 8. Edicion de planes desde el panel ──────────────────
create or replace function upsert_plan(
  p_code text,
  p_name text,
  p_price numeric,
  p_max_branches integer,
  p_max_users integer,
  p_has_inventory boolean,
  p_has_custom_domain boolean,
  p_active boolean default true,
  p_sort_order integer default 0
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede editar planes';
  end if;

  if p_code !~ '^[a-z0-9_]{2,20}$' then
    raise exception 'El codigo del plan solo admite minusculas, numeros y guion bajo';
  end if;

  if p_price < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  insert into plans (code, name, price, max_branches, max_users,
                     has_inventory, has_custom_domain, active, sort_order)
  values (p_code, trim(p_name), p_price, p_max_branches, p_max_users,
          p_has_inventory, p_has_custom_domain, p_active, p_sort_order)
  on conflict (code) do update set
    name = excluded.name,
    price = excluded.price,
    max_branches = excluded.max_branches,
    max_users = excluded.max_users,
    has_inventory = excluded.has_inventory,
    has_custom_domain = excluded.has_custom_domain,
    active = excluded.active,
    sort_order = excluded.sort_order;
end;
$$;

revoke all on function upsert_plan(text, text, numeric, integer, integer, boolean, boolean, boolean, integer) from public;
grant execute on function upsert_plan(text, text, numeric, integer, integer, boolean, boolean, boolean, integer) to authenticated;

-- Desactivar un plan en uso dejaria clientes apuntando a nada.
create or replace function archive_plan(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare en_uso integer;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede archivar planes';
  end if;

  select count(*) into en_uso from tenants where plan = p_code;
  if en_uso > 0 then
    raise exception 'Ese plan lo usan % clientes. Cambialos de plan primero.', en_uso;
  end if;

  update plans set active = false where code = p_code;
end;
$$;

revoke all on function archive_plan(text) from public;
grant execute on function archive_plan(text) to authenticated;

-- ── 9. Registro de gastos ────────────────────────────────
create or replace function add_expense(
  p_concept text,
  p_category text,
  p_amount numeric,
  p_recurring boolean default false,
  p_incurred_on date default current_date,
  p_note text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede registrar gastos';
  end if;

  if length(trim(coalesce(p_concept, ''))) < 2 then
    raise exception 'El concepto es obligatorio';
  end if;

  insert into platform_expenses (concept, category, amount, recurring, incurred_on, note)
  values (trim(p_concept), p_category, p_amount, p_recurring, p_incurred_on, trim(coalesce(p_note, '')))
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function add_expense(text, text, numeric, boolean, date, text) from public;
grant execute on function add_expense(text, text, numeric, boolean, date, text) to authenticated;

-- ── 10. VERIFICACION ─────────────────────────────────────
--    select * from platform_summary;
--    select * from platform_mrr_by_plan;
--    select * from platform_pnl;
--    select * from platform_at_risk;
