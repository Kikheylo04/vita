-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 2: registro y alta de empresas
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_tenants.sql (Fase 1)
--
--  Que resuelve:
--  Tras la Fase 1 el aislamiento funciona, pero no hay forma de
--  dar de alta un cliente que no sea escribiendo SQL a mano.
--
--  Aqui se agrega:
--   · Alta de empresa en una sola llamada, desde el registro
--   · Reserva de slugs para que nadie tome 'admin' o 'api'
--   · Vencimiento de la prueba gratuita
--   · Vista de la plataforma para ver a todos los clientes
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Slugs que no se pueden registrar ──────────────────
--  Chocarian con rutas de la plataforma o confundirian al cliente.
create table if not exists reserved_slugs (
  slug text primary key
);

insert into reserved_slugs (slug) values
  ('www'), ('admin'), ('api'), ('app'), ('mail'), ('ftp'),
  ('blog'), ('help'), ('soporte'), ('ayuda'), ('docs'),
  ('status'), ('cdn'), ('static'), ('assets'), ('dashboard'),
  ('panel'), ('plataforma'), ('platform'), ('registro'),
  ('signup'), ('login'), ('cuenta'), ('billing'), ('pagos'),
  ('demo'), ('test'), ('staging'), ('dev')
on conflict (slug) do nothing;

-- Se lee al registrarse, pero solo la plataforma la edita: sin
-- esto, cualquiera con la clave anonima podria reservar slugs.
alter table reserved_slugs enable row level security;

drop policy if exists "Anyone reads reserved slugs" on reserved_slugs;
create policy "Anyone reads reserved slugs" on reserved_slugs
  for select using (true);

drop policy if exists "Platform writes reserved slugs" on reserved_slugs;
create policy "Platform writes reserved slugs" on reserved_slugs
  for all using (is_platform()) with check (is_platform());

-- ── 2. ¿Esta libre este slug? ────────────────────────────
--  Lo consulta el formulario de registro mientras el usuario
--  escribe, para avisar antes de enviar.
create or replace function slug_available(p_slug text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    p_slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    and not exists (select 1 from reserved_slugs where slug = p_slug)
    and not exists (select 1 from tenants where slug = p_slug);
$$;

-- ── 3. Alta de empresa ───────────────────────────────────
--  El usuario ya existe (lo creo Supabase Auth al registrarse);
--  esto le crea su empresa y lo deja como dueno.
--
--  security definer porque el usuario recien registrado todavia
--  no tiene permisos para insertar en tenants: es justo lo que
--  esta llamada le concede.
create or replace function create_tenant(
  p_slug text,
  p_name text,
  p_full_name text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_tenant uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Hay que iniciar sesion para crear una empresa';
  end if;

  -- Un usuario, una empresa. Evita que alguien cree cientos.
  if exists (select 1 from profiles where id = uid and tenant_id is not null) then
    raise exception 'Esta cuenta ya tiene una empresa';
  end if;

  if not slug_available(p_slug) then
    raise exception 'La direccion "%" no esta disponible', p_slug;
  end if;

  if length(trim(p_name)) < 2 then
    raise exception 'El nombre del restaurante es obligatorio';
  end if;

  insert into tenants (slug, name, status, trial_ends_at)
  values (p_slug, trim(p_name), 'trial', now() + interval '14 days')
  returning id into new_tenant;

  -- El trigger de tenants ya creo su sucursal principal.
  insert into profiles (id, full_name, role, tenant_id, branch_id)
  values (uid, coalesce(nullif(trim(p_full_name), ''), ''), 'owner', new_tenant, null)
  on conflict (id) do update
    set role = 'owner', tenant_id = new_tenant,
        full_name = coalesce(nullif(trim(p_full_name), ''), profiles.full_name);

  -- Configuracion inicial, para que el panel no arranque vacio.
  insert into config (tenant_id, key, value) values
    (new_tenant, 'name', trim(p_name)),
    (new_tenant, 'full_name', trim(p_name))
  on conflict (tenant_id, key) do nothing;

  return new_tenant;
end;
$$;

revoke all on function create_tenant(text, text, text) from public;
grant execute on function create_tenant(text, text, text) to authenticated;

-- ── 4. Perfil de usuario nuevo, sin empresa ──────────────
--  Reemplaza el trigger de la Fase A, que asignaba 'manager'.
--  Ahora queda pendiente: create_tenant lo vuelve dueno, o el
--  dueno lo invita a su empresa como encargado.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role, tenant_id, branch_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''),
          'manager', null, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 5. Invitar a un encargado ────────────────────────────
--  El dueno asigna a un usuario ya registrado a una sucursal suya.
create or replace function assign_manager(
  p_email text,
  p_branch uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
  my uuid := my_tenant();
begin
  if not is_owner() then
    raise exception 'Solo el dueno puede asignar encargados';
  end if;

  if not exists (select 1 from branches where id = p_branch and tenant_id = my) then
    raise exception 'Esa sucursal no pertenece a tu empresa';
  end if;

  select id into target from auth.users where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'No hay ninguna cuenta con el correo %', p_email;
  end if;

  -- No se roba un usuario que ya pertenece a otra empresa.
  if exists (
    select 1 from profiles
    where id = target and tenant_id is not null and tenant_id <> my
  ) then
    raise exception 'Esa cuenta ya pertenece a otra empresa';
  end if;

  insert into profiles (id, role, tenant_id, branch_id)
  values (target, 'manager', my, p_branch)
  on conflict (id) do update
    set role = 'manager', tenant_id = my, branch_id = p_branch;
end;
$$;

revoke all on function assign_manager(text, uuid) from public;
grant execute on function assign_manager(text, uuid) to authenticated;

-- ── 6. Vencimiento de la prueba ──────────────────────────
--  Una empresa en prueba vencida deja de servir su sitio publico,
--  pero sus datos se conservan: si paga, vuelve intacta.
create or replace function tenant_is_live(t tenants)
returns boolean
language sql immutable
as $$
  select t.status = 'active'
      or (t.status = 'trial' and t.trial_ends_at > now());
$$;

-- La resolucion por dominio respeta el vencimiento.
create or replace function tenant_by_host(p_host text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from tenants t
  where (t.status = 'active'
         or (t.status = 'trial' and t.trial_ends_at > now()))
    and (t.custom_domain = p_host or t.slug = split_part(p_host, '.', 1))
  limit 1;
$$;

-- Un sitio con prueba vencida no debe seguir publico.
drop policy if exists "Public reads active tenants" on tenants;
create policy "Public reads active tenants" on tenants
  for select using (
    status = 'active'
    or (status = 'trial' and trial_ends_at > now())
    or is_platform()
    -- El dueno siempre ve su empresa, aunque este vencida: si no,
    -- no podria entrar al panel a pagar.
    or id = my_tenant()
  );

-- Marca como vencidas las pruebas que ya pasaron. Conviene
-- programarla a diario con pg_cron.
create or replace function expire_trials()
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  update tenants
    set status = 'suspended'
    where status = 'trial' and trial_ends_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── 7. Vista de la plataforma ────────────────────────────
--  Todos los clientes con su actividad, para el panel interno.
create or replace view platform_tenants as
select
  t.id,
  t.slug,
  t.name,
  t.custom_domain,
  t.template,
  t.status,
  t.plan,
  t.trial_ends_at,
  t.created_at,
  (t.status = 'trial' and t.trial_ends_at < now()) as trial_expired,
  (select count(*) from profiles  p where p.tenant_id = t.id) as users,
  (select count(*) from branches  b where b.tenant_id = t.id) as branches,
  (select count(*) from menu_items m where m.tenant_id = t.id) as menu_items,
  (select count(*) from orders o
     join branches b on b.id = o.branch_id
    where b.tenant_id = t.id) as orders,
  (select max(o.created_at) from orders o
     join branches b on b.id = o.branch_id
    where b.tenant_id = t.id) as last_order_at
from tenants t;

-- La vista hereda RLS de tenants: solo la plataforma ve todo.

-- ── 8. Acciones de la plataforma ─────────────────────────
create or replace function set_tenant_status(p_tenant uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede cambiar el estado de una empresa';
  end if;
  if p_status not in ('trial','active','suspended','cancelled') then
    raise exception 'Estado invalido: %', p_status;
  end if;
  update tenants set status = p_status where id = p_tenant;
end;
$$;

revoke all on function set_tenant_status(uuid, text) from public;
grant execute on function set_tenant_status(uuid, text) to authenticated;

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
end;
$$;

revoke all on function extend_trial(uuid, integer) from public;
grant execute on function extend_trial(uuid, integer) to authenticated;

-- ── 9. VERIFICACION ──────────────────────────────────────
--    select slug_available('pizzeria');   -- true
--    select slug_available('admin');      -- false, reservado
--    select slug_available('AB');         -- false, formato
--    select * from platform_tenants;      -- tus clientes
