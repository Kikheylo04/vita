-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Fase A: sucursales y roles
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_setup.sql, supabase_orders.sql,
--            supabase_orders_secure.sql, supabase_contact.sql
--  Compatible con supabase_payments.sql (no toca sus politicas
--  de pago; solo agrega branch_id a orders).
--
--  Que resuelve:
--  Hoy toda politica de escritura dice auth.role() = 'authenticated',
--  o sea que CUALQUIER usuario con sesion puede escribir en TODAS las
--  tablas. Con encargados por sucursal eso significa que el de una
--  sucursal podria editar el stock, el menu o los pedidos de otra.
--
--  Este script introduce sucursales, roles, y reescribe las politicas
--  para que un encargado solo alcance su propia sucursal.
--
--  Es idempotente: se puede correr mas de una vez sin duplicar datos.
-- ══════════════════════════════════════════════════════════

-- ── 1. Sucursales ────────────────────────────────────────
create table if not exists branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  address     text not null default '',
  neighborhood text not null default '',
  city        text not null default '',
  phone       text not null default '',
  maps_embed  text not null default '',
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Sucursal por defecto: hereda los datos que ya viven en config,
-- para que nada quede huerfano al asignar las filas existentes.
insert into branches (name, slug, address, neighborhood, city, phone, sort_order)
select
  coalesce((select value from config where key = 'name'), 'VITA'),
  'principal',
  coalesce((select value from config where key = 'address'), ''),
  coalesce((select value from config where key = 'neighborhood'), ''),
  coalesce((select value from config where key = 'city'), ''),
  coalesce((select value from config where key = 'phone'), ''),
  0
where not exists (select 1 from branches where slug = 'principal');

-- ── 2. Perfiles: usuario -> rol -> sucursal ──────────────
--  Se apoya en auth.users de Supabase. No duplica credenciales.
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       text not null default 'manager'
               check (role in ('admin','manager')),
  -- null = admin global (alcanza todas las sucursales)
  branch_id  uuid references branches(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Todo usuario que ya existia pasa a ser admin global: de lo
-- contrario el primer login tras esta migracion se quedaria sin
-- acceso a nada.
insert into profiles (id, full_name, role, branch_id)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', ''), 'admin', null
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- Alta automatica de perfil para usuarios nuevos.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role, branch_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'manager', null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── 3. Helpers de autorizacion ───────────────────────────
--  security definer para poder leer profiles sin que las propias
--  politicas de profiles provoquen recursion infinita.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function my_branch()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from profiles where id = auth.uid();
$$;

-- Verdadero si el usuario alcanza esa sucursal: admin siempre,
-- encargado solo la suya.
create or replace function can_reach(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin() or (target is not null and target = my_branch());
$$;

-- ── 4. branch_id en las tablas operativas ────────────────
alter table orders       add column if not exists branch_id uuid references branches(id);
alter table reservations add column if not exists branch_id uuid references branches(id);

-- Las filas que ya existian se asignan a la sucursal principal.
update orders
  set branch_id = (select id from branches where slug = 'principal')
  where branch_id is null;

update reservations
  set branch_id = (select id from branches where slug = 'principal')
  where branch_id is null;

create index if not exists orders_branch_idx       on orders (branch_id);
create index if not exists reservations_branch_idx on reservations (branch_id);

-- Un pedido o reservacion sin sucursal cae en la principal, para que
-- el formulario publico siga funcionando sin cambios.
create or replace function default_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.branch_id is null then
    new.branch_id := (select id from branches where slug = 'principal' limit 1);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_default_branch_orders on orders;
create trigger trg_default_branch_orders
  before insert on orders
  for each row execute function default_branch();

drop trigger if exists trg_default_branch_reservations on reservations;
create trigger trg_default_branch_reservations
  before insert on reservations
  for each row execute function default_branch();

-- ── 5. RLS de las tablas nuevas ──────────────────────────
alter table branches enable row level security;
alter table profiles enable row level security;

drop policy if exists "Public read active branches" on branches;
create policy "Public read active branches" on branches
  for select using (active = true or is_admin());

drop policy if exists "Admin writes branches" on branches;
create policy "Admin writes branches" on branches
  for all using (is_admin()) with check (is_admin());

-- Cada quien lee su perfil; el admin lee todos.
drop policy if exists "Read own profile" on profiles;
create policy "Read own profile" on profiles
  for select using (id = auth.uid() or is_admin());

-- Solo el admin reparte roles y sucursales: si un encargado pudiera
-- editarse el propio perfil, se ascenderia a admin.
drop policy if exists "Admin writes profiles" on profiles;
create policy "Admin writes profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- ── 6. Reescritura de politicas por sucursal ─────────────
--  Sustituye auth.role() = 'authenticated' (cualquier sesion escribe
--  cualquier fila) por el alcance real del usuario.

-- Pedidos
drop policy if exists "Admin full access orders" on orders;
create policy "Staff reads orders" on orders
  for select using (can_reach(branch_id));
create policy "Staff updates orders" on orders
  for update using (can_reach(branch_id)) with check (can_reach(branch_id));
create policy "Staff deletes orders" on orders
  for delete using (can_reach(branch_id));

-- Renglones de pedido: heredan el alcance de su pedido.
drop policy if exists "Admin full access order_items" on order_items;
create policy "Staff reads order_items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and can_reach(o.branch_id))
  );
create policy "Staff updates order_items" on order_items
  for update using (
    exists (select 1 from orders o where o.id = order_id and can_reach(o.branch_id))
  );
create policy "Staff deletes order_items" on order_items
  for delete using (
    exists (select 1 from orders o where o.id = order_id and can_reach(o.branch_id))
  );

-- Reservaciones
drop policy if exists "Admin full access reservations" on reservations;
create policy "Staff reads reservations" on reservations
  for select using (can_reach(branch_id));
create policy "Staff updates reservations" on reservations
  for update using (can_reach(branch_id)) with check (can_reach(branch_id));
create policy "Staff deletes reservations" on reservations
  for delete using (can_reach(branch_id));

-- Catalogo y contenido: son globales, los edita el admin.
-- El menu por sucursal llega en la Fase D.
drop policy if exists "Admin full access menu" on menu_items;
create policy "Admin writes menu" on menu_items
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin full access events" on events;
create policy "Admin writes events" on events
  for all using (is_admin()) with check (is_admin());

drop policy if exists "Admin full access config" on config;
create policy "Admin writes config" on config
  for all using (is_admin()) with check (is_admin());

-- Testimonios y mensajes: los modera cualquier miembro del staff.
drop policy if exists "Admin full access testimonials" on testimonials;
create policy "Staff moderates testimonials" on testimonials
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Admin full access contact" on contact_messages;
create policy "Staff reads contact" on contact_messages
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ── 7. Comprobacion ──────────────────────────────────────
--  Deberia devolver una sucursal y al menos un perfil admin.
--    select * from branches;
--    select p.role, p.branch_id, u.email
--    from profiles p join auth.users u on u.id = p.id;
