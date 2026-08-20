-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 6: soporte y auditoria
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_platform_finance.sql (Fase 5)
--
--  Que resuelve:
--  · Si un cliente llama con un problema, no habia forma de ver
--    su panel sin pedirle la contrasena.
--  · No habia historial de cobros por cliente.
--  · Ninguna accion quedaba registrada: suspender a alguien por
--    error no dejaba rastro de quien lo hizo.
--  · Solo podia existir un operador de plataforma.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Bitacora de acciones ──────────────────────────────
--  Toda accion de la plataforma sobre un cliente queda escrita.
create table if not exists platform_audit (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  action     text not null,
  tenant_id  uuid references tenants(id) on delete set null,
  tenant_name text not null default '',
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_date_idx on platform_audit (created_at desc);
create index if not exists platform_audit_tenant_idx on platform_audit (tenant_id, created_at desc);

alter table platform_audit enable row level security;

drop policy if exists "Platform reads audit" on platform_audit;
create policy "Platform reads audit" on platform_audit
  for select using (is_platform());

-- Sin politica de insert: solo se escribe desde las funciones
-- security definer, para que nadie pueda falsear una entrada.

create or replace function log_platform_action(
  p_action text,
  p_tenant uuid default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into platform_audit (actor_id, actor_email, action, tenant_id, tenant_name, detail)
  values (
    auth.uid(),
    coalesce((select email from auth.users where id = auth.uid()), ''),
    p_action,
    p_tenant,
    coalesce((select name from tenants where id = p_tenant), ''),
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

-- ── 2. Suplantacion para soporte ─────────────────────────
--  El operador toma prestada la vista de un cliente sin conocer
--  su contrasena. Se guarda en su propio perfil y caduca sola,
--  para que nadie quede dentro de un cliente por olvido.
alter table profiles
  add column if not exists impersonating uuid references tenants(id) on delete set null,
  add column if not exists impersonating_until timestamptz;

create or replace function start_impersonation(p_tenant uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede entrar a la cuenta de un cliente';
  end if;

  if not exists (select 1 from tenants where id = p_tenant) then
    raise exception 'Esa empresa no existe';
  end if;

  update profiles
    set impersonating = p_tenant,
        impersonating_until = now() + interval '60 minutes'
    where id = auth.uid();

  perform log_platform_action('impersonation_start', p_tenant);
end;
$$;

create or replace function stop_impersonation()
returns void
language plpgsql security definer set search_path = public
as $$
declare prev uuid;
begin
  select impersonating into prev from profiles where id = auth.uid();

  update profiles
    set impersonating = null, impersonating_until = null
    where id = auth.uid();

  if prev is not null then
    perform log_platform_action('impersonation_end', prev);
  end if;
end;
$$;

revoke all on function start_impersonation(uuid) from public;
revoke all on function stop_impersonation() from public;
grant execute on function start_impersonation(uuid) to authenticated;
grant execute on function stop_impersonation() to authenticated;

-- my_tenant devuelve la empresa suplantada mientras la sesion
-- este vigente. Asi TODAS las politicas existentes ven al cliente
-- sin tener que reescribir ninguna.
create or replace function my_tenant()
returns uuid
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select impersonating from profiles
      where id = auth.uid()
        and impersonating is not null
        and impersonating_until > now()),
    (select tenant_id from profiles where id = auth.uid())
  );
$$;

-- Mientras suplanta, el operador debe comportarse como dueno para
-- alcanzar las secciones del cliente.
create or replace function is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('owner','platform')
  );
$$;

-- Estado actual, para que el panel muestre el aviso de salida.
create or replace function impersonation_state()
returns table (tenant_id uuid, tenant_name text, expires_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.impersonating, t.name, p.impersonating_until
  from profiles p
  join tenants t on t.id = p.impersonating
  where p.id = auth.uid()
    and p.impersonating is not null
    and p.impersonating_until > now();
$$;

grant execute on function impersonation_state() to authenticated;

-- ── 3. Historial de cobros ───────────────────────────────
create or replace view platform_payments as
select
  sp.id,
  sp.tenant_id,
  t.name        as tenant_name,
  t.slug,
  sp.amount,
  sp.status,
  sp.mp_payment_id,
  coalesce(sp.paid_at, sp.created_at) as paid_at,
  s.plan
from subscription_payments sp
join tenants t on t.id = sp.tenant_id
left join subscriptions s on s.id = sp.subscription_id
order by coalesce(sp.paid_at, sp.created_at) desc;

-- ── 4. Notas por cliente ─────────────────────────────────
--  Para dejar constancia de lo acordado en una llamada.
create table if not exists tenant_notes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  author_email text not null default '',
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists tenant_notes_idx on tenant_notes (tenant_id, created_at desc);

alter table tenant_notes enable row level security;

-- Son notas internas: el cliente no las ve.
drop policy if exists "Platform manages notes" on tenant_notes;
create policy "Platform manages notes" on tenant_notes
  for all using (is_platform()) with check (is_platform());

create or replace function add_tenant_note(p_tenant uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede escribir notas';
  end if;

  if length(trim(coalesce(p_body, ''))) < 2 then
    raise exception 'La nota esta vacia';
  end if;

  insert into tenant_notes (tenant_id, author_email, body)
  values (
    p_tenant,
    coalesce((select email from auth.users where id = auth.uid()), ''),
    trim(p_body)
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function add_tenant_note(uuid, text) from public;
grant execute on function add_tenant_note(uuid, text) to authenticated;

-- ── 5. Mas operadores de plataforma ──────────────────────
--  Para dar acceso a un socio o a alguien de soporte.
create or replace function grant_platform_access(p_email text)
returns void
language plpgsql security definer set search_path = public
as $$
declare target uuid;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede dar acceso de operador';
  end if;

  select id into target from auth.users where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'No hay ninguna cuenta con el correo %', p_email;
  end if;

  -- Un operador no pertenece a ninguna empresa: ve todas.
  insert into profiles (id, role, tenant_id, branch_id)
  values (target, 'platform', null, null)
  on conflict (id) do update
    set role = 'platform', tenant_id = null, branch_id = null;

  perform log_platform_action('grant_platform', null,
    jsonb_build_object('email', trim(p_email)));
end;
$$;

create or replace function revoke_platform_access(p_email text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
  restantes integer;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede quitar acceso de operador';
  end if;

  select id into target from auth.users where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'No hay ninguna cuenta con el correo %', p_email;
  end if;

  -- Nunca dejar la plataforma sin operadores: nadie podria entrar.
  select count(*) into restantes from profiles
    where role = 'platform' and id <> target;

  if restantes = 0 then
    raise exception 'Es el ultimo operador: primero da acceso a alguien mas';
  end if;

  update profiles set role = 'manager' where id = target;

  perform log_platform_action('revoke_platform', null,
    jsonb_build_object('email', trim(p_email)));
end;
$$;

revoke all on function grant_platform_access(text) from public;
revoke all on function revoke_platform_access(text) from public;
grant execute on function grant_platform_access(text) to authenticated;
grant execute on function revoke_platform_access(text) to authenticated;

create or replace view platform_operators as
select p.id, u.email, p.full_name, p.created_at
from profiles p
join auth.users u on u.id = p.id
where p.role = 'platform'
order by p.created_at;

-- ── 6. Registro en las acciones que ya existian ──────────
create or replace function set_tenant_status(p_tenant uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare anterior text;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede cambiar el estado de una empresa';
  end if;
  if p_status not in ('trial','active','suspended','cancelled') then
    raise exception 'Estado invalido: %', p_status;
  end if;

  select status into anterior from tenants where id = p_tenant;
  update tenants set status = p_status where id = p_tenant;

  perform log_platform_action('status_change', p_tenant,
    jsonb_build_object('from', anterior, 'to', p_status));
end;
$$;

create or replace function extend_trial(p_tenant uuid, p_days integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede extender una prueba';
  end if;

  update tenants
    set trial_ends_at = greatest(trial_ends_at, now()) + (p_days || ' days')::interval,
        status = case when status = 'suspended' then 'trial' else status end
    where id = p_tenant;

  perform log_platform_action('trial_extended', p_tenant,
    jsonb_build_object('days', p_days));
end;
$$;

-- ── 7. VERIFICACION ──────────────────────────────────────
--    select * from platform_operators;
--    select * from platform_payments limit 10;
--    select * from platform_audit order by created_at desc limit 10;
--    select * from impersonation_state();
