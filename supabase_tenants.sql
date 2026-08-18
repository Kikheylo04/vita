-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 1: aislamiento multi-empresa
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: TODAS las migraciones anteriores, en orden.
--
--  Que hace:
--  Convierte la instalacion de un restaurante en una plataforma
--  donde varias empresas conviven en la misma base sin verse
--  entre ellas.
--
--  Modelo de aislamiento en dos niveles:
--    tenants   la empresa que contrata la plataforma
--    branches  sus sucursales (ya existia)
--
--  Cada tabla se aisla por uno de dos caminos:
--    · tenant_id directo      -> catalogo y contenido de la empresa
--    · a traves de branch_id  -> datos operativos de una sucursal
--
--  LEER ANTES DE CORRER:
--  Este script reescribe TODAS las politicas RLS. Si algo queda
--  mal, una empresa podria ver datos de otra. Al final hay una
--  seccion de verificacion: no se debe pasar a la Fase 2 sin
--  que esas consultas den el resultado esperado.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. La empresa ────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  -- Subdominio: pizzeria.laplataforma.com
  slug        text not null unique,
  name        text not null,
  -- Dominio propio, cuando el cliente lo conecte (fase posterior).
  custom_domain text unique,
  -- Plantilla elegida. 'classic' es la actual.
  template    text not null default 'classic',
  -- Identidad serializada: lo que hoy vive en brand.ts.
  brand       jsonb not null default '{}'::jsonb,

  -- Ciclo de vida comercial
  status      text not null default 'trial'
                check (status in ('trial','active','suspended','cancelled')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  plan        text not null default 'basic',

  created_at  timestamptz not null default now()
);

create index if not exists tenants_slug_idx   on tenants (slug);
create index if not exists tenants_status_idx on tenants (status);
create unique index if not exists tenants_domain_idx
  on tenants (custom_domain) where custom_domain is not null;

-- Empresa para los datos que ya existen. Sin esto, la migracion
-- dejaria huerfano todo el contenido actual.
insert into tenants (slug, name, status, plan, brand)
select
  'principal',
  coalesce((select value from config where key = 'name' limit 1), 'Restaurante'),
  'active',
  'owner',
  '{}'::jsonb
where not exists (select 1 from tenants where slug = 'principal');

-- ── 2. Quien pertenece a que empresa ─────────────────────
--  profiles gana tenant_id y un rol nuevo: 'owner', el dueno de
--  la empresa. 'admin' pasa a ser el operador de la plataforma.
alter table profiles
  add column if not exists tenant_id uuid references tenants(id) on delete cascade;

alter table profiles drop constraint if exists profiles_role_check;

-- Los admins actuales pasan a operadores de la plataforma: son
-- ustedes, no clientes. Se convierte antes de imponer la
-- restriccion nueva, o las filas viejas la violarian.
update profiles set role = 'platform' where role = 'admin';
-- Cualquier rol fuera del juego nuevo cae en 'manager'.
update profiles set role = 'manager'
  where role not in ('platform','owner','manager');

alter table profiles add constraint profiles_role_check
  check (role in ('platform','owner','manager'));

update profiles
  set tenant_id = (select id from tenants where slug = 'principal')
  where tenant_id is null and role <> 'platform';

create index if not exists profiles_tenant_idx on profiles (tenant_id);

-- ── 3. tenant_id en el catalogo y contenido ──────────────
--  Estas tablas no cuelgan de una sucursal: son de la empresa.
alter table menu_items       add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table config           add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table testimonials     add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table events           add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table contact_messages add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table ingredients      add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table branches         add column if not exists tenant_id uuid references tenants(id) on delete cascade;

-- Todo lo existente pasa a la empresa principal.
do $$
declare
  t uuid := (select id from tenants where slug = 'principal');
begin
  update menu_items       set tenant_id = t where tenant_id is null;
  update config           set tenant_id = t where tenant_id is null;
  update testimonials     set tenant_id = t where tenant_id is null;
  update events           set tenant_id = t where tenant_id is null;
  update contact_messages set tenant_id = t where tenant_id is null;
  update ingredients      set tenant_id = t where tenant_id is null;
  update branches         set tenant_id = t where tenant_id is null;
end $$;

create index if not exists menu_items_tenant_idx   on menu_items (tenant_id);
create index if not exists config_tenant_idx       on config (tenant_id);
create index if not exists testimonials_tenant_idx on testimonials (tenant_id);
create index if not exists events_tenant_idx       on events (tenant_id);
create index if not exists contact_tenant_idx      on contact_messages (tenant_id);
create index if not exists ingredients_tenant_idx  on ingredients (tenant_id);
create index if not exists branches_tenant_idx     on branches (tenant_id);

-- config.key era unico global: dos empresas no podrian tener la
-- misma clave. Pasa a ser unico por empresa.
alter table config drop constraint if exists config_pkey;
alter table config add primary key (tenant_id, key);

-- Igual el nombre de ingrediente y el slug de sucursal.
drop index if exists ingredients_name_key;
create unique index if not exists ingredients_name_key
  on ingredients (tenant_id, lower(name));

alter table branches drop constraint if exists branches_slug_key;
create unique index if not exists branches_slug_key
  on branches (tenant_id, slug);

-- ── 4. Helpers de alcance ────────────────────────────────
--  security definer para leer profiles sin recursion de politicas.

-- Operador de la plataforma: ve todo. Son ustedes.
create or replace function is_platform()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'platform');
$$;

create or replace function my_tenant()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from profiles where id = auth.uid();
$$;

-- Dueno de la empresa: alcanza todas sus sucursales.
create or replace function is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner','platform'));
$$;

-- ¿Alcanza esta empresa?
create or replace function reaches_tenant(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select is_platform() or (target is not null and target = my_tenant());
$$;

-- is_admin se conserva por compatibilidad: lo usan las politicas
-- de las migraciones anteriores hasta que este script las cambie.
create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('platform','owner')
  );
$$;

-- can_reach ahora exige que la sucursal sea de la empresa del
-- usuario. Antes solo comparaba branch_id: un encargado con el id
-- de una sucursal ajena habria pasado.
create or replace function can_reach(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when is_platform() then true
    when target is null then false
    else exists (
      select 1 from branches b
      where b.id = target
        and b.tenant_id = my_tenant()
        and (is_owner() or b.id = (select branch_id from profiles where id = auth.uid()))
    )
  end;
$$;

-- ── 5. Resolucion de la empresa por dominio ──────────────
--  El sitio publico llega sin sesion: identifica la empresa por
--  su subdominio o dominio propio.
create or replace function tenant_by_host(p_host text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from tenants
  where status in ('trial','active')
    and (custom_domain = p_host or slug = split_part(p_host, '.', 1))
  limit 1;
$$;

-- ── 6. RLS: contenido y catalogo ─────────────────────────
alter table tenants enable row level security;

-- El sitio publico necesita leer la empresa para pintarse.
drop policy if exists "Public reads active tenants" on tenants;
create policy "Public reads active tenants" on tenants
  for select using (status in ('trial','active') or is_platform());

-- El dueno edita su empresa; la plataforma, todas.
drop policy if exists "Owner updates own tenant" on tenants;
create policy "Owner updates own tenant" on tenants
  for update using (is_platform() or (id = my_tenant() and is_owner()))
  with check (is_platform() or (id = my_tenant() and is_owner()));

drop policy if exists "Platform writes tenants" on tenants;
create policy "Platform writes tenants" on tenants
  for insert with check (is_platform());
drop policy if exists "Platform deletes tenants" on tenants;
create policy "Platform deletes tenants" on tenants
  for delete using (is_platform());

-- Menu: publico lee el activo de cualquier empresa (el frontend
-- filtra por la suya); escribe solo quien alcanza la empresa.
drop policy if exists "Public read menu" on menu_items;
create policy "Public read menu" on menu_items
  for select using (active = true or reaches_tenant(tenant_id));

drop policy if exists "Admin writes menu" on menu_items;
drop policy if exists "Tenant writes menu" on menu_items;
create policy "Tenant writes menu" on menu_items
  for all using (reaches_tenant(tenant_id) and is_owner())
  with check (reaches_tenant(tenant_id) and is_owner());

-- Config
drop policy if exists "Public read config" on config;
create policy "Public read config" on config
  for select using (true);

drop policy if exists "Admin writes config" on config;
drop policy if exists "Tenant writes config" on config;
create policy "Tenant writes config" on config
  for all using (reaches_tenant(tenant_id) and is_owner())
  with check (reaches_tenant(tenant_id) and is_owner());

-- Eventos
drop policy if exists "Public read active events" on events;
create policy "Public read active events" on events
  for select using (active = true or reaches_tenant(tenant_id));

drop policy if exists "Admin writes events" on events;
drop policy if exists "Tenant writes events" on events;
create policy "Tenant writes events" on events
  for all using (reaches_tenant(tenant_id))
  with check (reaches_tenant(tenant_id));

-- Testimonios: el visitante los envia, la empresa los modera.
drop policy if exists "Public read approved testimonials" on testimonials;
create policy "Public read approved testimonials" on testimonials
  for select using (status = 'approved' or reaches_tenant(tenant_id));

drop policy if exists "Staff moderates testimonials" on testimonials;
drop policy if exists "Tenant moderates testimonials" on testimonials;
create policy "Tenant moderates testimonials" on testimonials
  for update using (reaches_tenant(tenant_id)) with check (reaches_tenant(tenant_id));
create policy "Tenant deletes testimonials" on testimonials
  for delete using (reaches_tenant(tenant_id));

-- Mensajes de contacto
drop policy if exists "Staff reads contact" on contact_messages;
drop policy if exists "Tenant reads contact" on contact_messages;
create policy "Tenant reads contact" on contact_messages
  for select using (reaches_tenant(tenant_id));
create policy "Tenant updates contact" on contact_messages
  for update using (reaches_tenant(tenant_id)) with check (reaches_tenant(tenant_id));
create policy "Tenant deletes contact" on contact_messages
  for delete using (reaches_tenant(tenant_id));

-- Ingredientes
drop policy if exists "Staff reads ingredients" on ingredients;
create policy "Staff reads ingredients" on ingredients
  for select using (reaches_tenant(tenant_id));

drop policy if exists "Admin writes ingredients" on ingredients;
drop policy if exists "Tenant writes ingredients" on ingredients;
create policy "Tenant writes ingredients" on ingredients
  for all using (reaches_tenant(tenant_id) and is_owner())
  with check (reaches_tenant(tenant_id) and is_owner());

-- Sucursales
drop policy if exists "Public read active branches" on branches;
create policy "Public read active branches" on branches
  for select using (active = true or reaches_tenant(tenant_id));

drop policy if exists "Admin writes branches" on branches;
drop policy if exists "Tenant writes branches" on branches;
create policy "Tenant writes branches" on branches
  for all using (reaches_tenant(tenant_id) and is_owner())
  with check (reaches_tenant(tenant_id) and is_owner());

-- Perfiles: cada quien el suyo; el dueno los de su empresa.
drop policy if exists "Read own profile" on profiles;
create policy "Read own profile" on profiles
  for select using (
    id = auth.uid() or is_platform() or (reaches_tenant(tenant_id) and is_owner())
  );

drop policy if exists "Admin writes profiles" on profiles;
drop policy if exists "Owner writes profiles" on profiles;
create policy "Owner writes profiles" on profiles
  for all using (is_platform() or (reaches_tenant(tenant_id) and is_owner()))
  with check (is_platform() or (reaches_tenant(tenant_id) and is_owner()));

-- ── 7. Recetas: aisladas por su platillo ─────────────────
drop policy if exists "Staff reads recipes" on recipe_items;
create policy "Staff reads recipes" on recipe_items
  for select using (
    exists (select 1 from menu_items m
            where m.id = menu_item_id and reaches_tenant(m.tenant_id))
  );

drop policy if exists "Admin writes recipes" on recipe_items;
drop policy if exists "Tenant writes recipes" on recipe_items;
create policy "Tenant writes recipes" on recipe_items
  for all using (
    exists (select 1 from menu_items m
            where m.id = menu_item_id and reaches_tenant(m.tenant_id) and is_owner())
  ) with check (
    exists (select 1 from menu_items m
            where m.id = menu_item_id and reaches_tenant(m.tenant_id) and is_owner())
  );

-- ── 8. Herencia de tenant_id al insertar ─────────────────
--  El frontend no deberia tener que mandarlo: se deduce del
--  usuario, y asi no puede escribir en otra empresa.
create or replace function inherit_tenant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := my_tenant();
  end if;
  -- Nadie escribe fuera de su empresa, aunque lo intente.
  if not is_platform() and new.tenant_id is distinct from my_tenant() then
    raise exception 'No se puede escribir en otra empresa';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['menu_items','events','ingredients','branches','config']
  loop
    execute format('drop trigger if exists trg_inherit_tenant on %I', t);
    execute format(
      'create trigger trg_inherit_tenant before insert on %I
       for each row execute function inherit_tenant()', t);
  end loop;
end $$;

-- ── 9. Seed de una empresa nueva ─────────────────────────
--  Toda empresa arranca con una sucursal, o el panel se veria
--  vacio y los pedidos no tendrian donde caer.
create or replace function seed_new_tenant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into branches (tenant_id, name, slug, active, sort_order)
  values (new.id, new.name, 'principal', true, 0)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_new_tenant on tenants;
create trigger trg_seed_new_tenant
  after insert on tenants
  for each row execute function seed_new_tenant();

-- ── 10. VERIFICACION — no seguir sin esto ────────────────
--
--  a) Una empresa y tu perfil como operador de plataforma:
--       select slug, name, status from tenants;
--       select u.email, p.role, p.tenant_id
--       from profiles p join auth.users u on u.id = p.id;
--     Se espera: 'principal' activa, y tu correo con role='platform'.
--
--  b) Nada quedo sin empresa:
--       select 'menu_items' t, count(*) from menu_items where tenant_id is null
--       union all select 'config', count(*) from config where tenant_id is null
--       union all select 'branches', count(*) from branches where tenant_id is null
--       union all select 'events', count(*) from events where tenant_id is null
--       union all select 'ingredients', count(*) from ingredients where tenant_id is null;
--     Se espera: 0 en todas.
--
--  c) Resolucion por dominio:
--       select tenant_by_host('principal.laplataforma.com');
--     Se espera: el uuid de la empresa principal.
