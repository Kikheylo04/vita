-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Fase D: menu por sucursal
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_recipes.sql (Fase C)
--
--  Modelo:
--  menu_items sigue siendo el catalogo maestro (que platillos
--  existen). branch_menu decide cuales OFRECE cada sucursal y a
--  que precio.
--
--  Regla de precio: si la sucursal define price_override, ese
--  manda; si no, se usa el precio del catalogo. Asi una sucursal
--  nueva hereda la carta sin tener que capturar precios.
--
--  CUIDADO: este script reescribe set_order_item_price, el trigger
--  que blinda los precios. Antes leia de menu_items; ahora debe
--  leer el precio de la sucursal del pedido, o cobraria de menos
--  en las sucursales con precio propio.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Que ofrece cada sucursal ──────────────────────────
create table if not exists branch_menu (
  branch_id      uuid not null references branches(id) on delete cascade,
  menu_item_id   uuid not null references menu_items(id) on delete cascade,
  available      boolean not null default true,
  -- null = hereda el precio del catalogo.
  price_override numeric(8,2),
  sort_order     integer not null default 0,
  primary key (branch_id, menu_item_id)
);

create index if not exists branch_menu_item_idx on branch_menu (menu_item_id);

-- ── 2. Precio efectivo en un solo lugar ──────────────────
--  Lo usan el trigger de precios, el sitio publico y el panel,
--  para que los tres coincidan siempre.
create or replace function effective_price(p_branch uuid, p_item uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select bm.price_override
     from branch_menu bm
     where bm.branch_id = p_branch and bm.menu_item_id = p_item),
    (select m.price from menu_items m where m.id = p_item)
  );
$$;

-- ── 3. Toda sucursal arranca con la carta completa ───────
insert into branch_menu (branch_id, menu_item_id, available, sort_order)
select b.id, m.id, m.active, m.sort_order
from branches b cross join menu_items m
on conflict do nothing;

-- Sucursal nueva: hereda el catalogo.
create or replace function seed_branch_menu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into branch_menu (branch_id, menu_item_id, available, sort_order)
  select new.id, m.id, m.active, m.sort_order from menu_items m
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_branch_menu on branches;
create trigger trg_seed_branch_menu
  after insert on branches
  for each row execute function seed_branch_menu();

-- Platillo nuevo: aparece en todas las sucursales.
create or replace function seed_menu_item_branches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into branch_menu (branch_id, menu_item_id, available, sort_order)
  select b.id, new.id, new.active, new.sort_order from branches b
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_menu_item_branches on menu_items;
create trigger trg_seed_menu_item_branches
  after insert on menu_items
  for each row execute function seed_menu_item_branches();

-- ── 4. El blindaje de precios, ahora por sucursal ────────
--  Reemplaza la version de supabase_orders_secure.sql.
create or replace function set_order_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  real_price  numeric(8,2);
  real_name   text;
  order_branch uuid;
  is_available boolean;
begin
  if new.menu_item_id is null then
    raise exception 'menu_item_id es obligatorio';
  end if;

  select branch_id into order_branch from orders where id = new.order_id;

  select m.name into real_name
  from menu_items m
  where m.id = new.menu_item_id and m.active = true;

  if not found then
    raise exception 'El platillo % no existe o no esta disponible', new.menu_item_id;
  end if;

  -- La sucursal puede haber retirado el platillo de su carta.
  select bm.available into is_available
  from branch_menu bm
  where bm.branch_id = order_branch and bm.menu_item_id = new.menu_item_id;

  if is_available is false then
    raise exception 'El platillo % no se ofrece en esa sucursal', real_name;
  end if;

  -- Precio de la sucursal; si no tiene propio, el del catalogo.
  real_price := effective_price(order_branch, new.menu_item_id);

  if real_price is null then
    raise exception 'El platillo % no tiene precio', real_name;
  end if;

  -- Se ignora lo que haya mandado el cliente.
  new.price := real_price;
  new.name  := real_name;

  if new.quantity is null or new.quantity < 1 or new.quantity > 50 then
    raise exception 'Cantidad invalida: %', new.quantity;
  end if;

  return new;
end;
$$;

-- ── 5. RLS ───────────────────────────────────────────────
alter table branch_menu enable row level security;

-- El sitio publico lee la carta de la sucursal que elija el visitante.
drop policy if exists "Public reads branch menu" on branch_menu;
create policy "Public reads branch menu" on branch_menu
  for select using (true);

-- El encargado ajusta disponibilidad y precio de SU sucursal;
-- el admin, de todas.
drop policy if exists "Staff writes branch menu" on branch_menu;
create policy "Staff writes branch menu" on branch_menu
  for all using (can_reach(branch_id)) with check (can_reach(branch_id));

-- ── 6. Vista publica de la carta ─────────────────────────
--  Un solo lugar del que leer, con el precio ya resuelto.
create or replace view branch_menu_public as
select
  bm.branch_id,
  b.slug          as branch_slug,
  m.id            as menu_item_id,
  m.cat,
  m.name,
  m.description,
  m.description_en,
  coalesce(bm.price_override, m.price) as price,
  m.badge,
  m.image,
  bm.sort_order
from branch_menu bm
join branches   b on b.id = bm.branch_id
join menu_items m on m.id = bm.menu_item_id
where bm.available = true
  and m.active = true
  and b.active = true;

-- ── 7. Comprobacion ──────────────────────────────────────
--  Cuantos platillos ofrece cada sucursal y su precio efectivo:
--    select branch_slug, count(*), min(price), max(price)
--    from branch_menu_public group by branch_slug;
