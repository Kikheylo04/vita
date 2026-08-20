-- ══════════════════════════════════════════════════════════
--  Plataforma — alta de clientes desde el panel
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_subscriptions.sql (Fase 3)
--
--  Que resuelve:
--  create_tenant() solo sirve para quien se registra a si mismo.
--  Faltaba la via en que USTEDES dan de alta un cliente: se vende
--  por telefono o en persona, se crea la empresa, y el dueno recibe
--  su acceso.
--
--  Dos caminos, segun si el dueno ya tiene cuenta:
--   · Con correo de una cuenta existente -> se le asigna la empresa
--   · Sin correo -> la empresa queda sin dueno y se invita despues
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Alta de empresa por la plataforma ─────────────────
create or replace function platform_create_tenant(
  p_slug text,
  p_name text,
  p_owner_email text default null,
  p_plan text default 'basic',
  p_trial_days integer default 14
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_tenant uuid;
  owner_id uuid;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede dar de alta clientes';
  end if;

  if not slug_available(p_slug) then
    raise exception 'La direccion "%" no esta disponible', p_slug;
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre del restaurante es obligatorio';
  end if;

  if not exists (select 1 from plans where code = p_plan and active) then
    raise exception 'Plan invalido: %', p_plan;
  end if;

  -- Se valida el dueno ANTES de crear la empresa, para no dejar
  -- una empresa a medias si el correo esta mal.
  if p_owner_email is not null and trim(p_owner_email) <> '' then
    select id into owner_id
    from auth.users
    where lower(email) = lower(trim(p_owner_email));

    if owner_id is null then
      raise exception 'No hay ninguna cuenta con el correo %. Pide al cliente que se registre primero.', p_owner_email;
    end if;

    if exists (
      select 1 from profiles
      where id = owner_id and tenant_id is not null
    ) then
      raise exception 'Esa cuenta ya pertenece a otra empresa';
    end if;
  end if;

  insert into tenants (slug, name, plan, status, trial_ends_at)
  values (
    p_slug,
    trim(p_name),
    p_plan,
    'trial',
    now() + (greatest(p_trial_days, 0) || ' days')::interval
  )
  returning id into new_tenant;

  -- El trigger de tenants ya creo la sucursal principal.

  if owner_id is not null then
    insert into profiles (id, role, tenant_id, branch_id)
    values (owner_id, 'owner', new_tenant, null)
    on conflict (id) do update
      set role = 'owner', tenant_id = new_tenant;
  end if;

  insert into config (tenant_id, key, value) values
    (new_tenant, 'name', trim(p_name)),
    (new_tenant, 'full_name', trim(p_name))
  on conflict (tenant_id, key) do nothing;

  return new_tenant;
end;
$$;

revoke all on function platform_create_tenant(text, text, text, text, integer) from public;
grant execute on function platform_create_tenant(text, text, text, text, integer) to authenticated;

-- ── 2. Asignar dueno despues del alta ────────────────────
--  Para la empresa creada sin correo, o para transferir un negocio
--  que cambio de manos.
create or replace function platform_assign_owner(
  p_tenant uuid,
  p_email text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede asignar duenos';
  end if;

  select id into owner_id
  from auth.users
  where lower(email) = lower(trim(p_email));

  if owner_id is null then
    raise exception 'No hay ninguna cuenta con el correo %', p_email;
  end if;

  if exists (
    select 1 from profiles
    where id = owner_id and tenant_id is not null and tenant_id <> p_tenant
  ) then
    raise exception 'Esa cuenta ya pertenece a otra empresa';
  end if;

  insert into profiles (id, role, tenant_id, branch_id)
  values (owner_id, 'owner', p_tenant, null)
  on conflict (id) do update
    set role = 'owner', tenant_id = p_tenant, branch_id = null;
end;
$$;

revoke all on function platform_assign_owner(uuid, text) from public;
grant execute on function platform_assign_owner(uuid, text) to authenticated;

-- ── 3. Eliminar un cliente ───────────────────────────────
--  Borra la empresa y todo lo suyo en cascada. Es irreversible:
--  para dejar de cobrar sin perder datos, se usa 'cancelled'.
create or replace function platform_delete_tenant(p_tenant uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede eliminar clientes';
  end if;

  -- Los perfiles quedan libres para poder reasignarse; borrarlos
  -- eliminaria la cuenta de acceso de la persona.
  update profiles
    set tenant_id = null, branch_id = null, role = 'manager'
    where tenant_id = p_tenant;

  delete from tenants where id = p_tenant;
end;
$$;

revoke all on function platform_delete_tenant(uuid) from public;
grant execute on function platform_delete_tenant(uuid) to authenticated;

-- ── 4. Duenos de cada empresa, para el panel ─────────────
create or replace view platform_tenant_owners as
select
  p.tenant_id,
  u.email,
  p.full_name,
  p.role
from profiles p
join auth.users u on u.id = p.id
where p.tenant_id is not null and p.role = 'owner';

-- ── 5. VERIFICACION ──────────────────────────────────────
--    select platform_create_tenant('pizzeria-prueba', 'Pizzería Prueba');
--    select * from platform_tenants;
--    select * from platform_tenant_owners;
