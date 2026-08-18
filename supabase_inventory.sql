-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Fase B: ingredientes e inventario
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_branches.sql (Fase A)
--
--  Modelo:
--  · ingredients      catalogo global (que existe y en que unidad)
--  · branch_stock     existencia por sucursal (cuanto hay de cada uno)
--  · stock_movements  bitacora de todo cambio (por que cambio)
--
--  El stock NUNCA se edita a mano: se registra un movimiento y un
--  trigger recalcula la existencia. Asi cada kilo tiene su historia
--  y un ajuste equivocado se puede rastrear.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Catalogo de ingredientes ──────────────────────────
create table if not exists ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Unidad de medida en la que se compra y se descuenta.
  unit        text not null default 'kg'
                check (unit in ('kg','g','l','ml','pza','paq')),
  category    text not null default 'General',
  -- Costo por unidad. Sirve para valuar el inventario.
  cost        numeric(10,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists ingredients_name_key
  on ingredients (lower(name));

-- ── 2. Existencia por sucursal ───────────────────────────
create table if not exists branch_stock (
  branch_id     uuid not null references branches(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  -- Se permite negativo a proposito: la cocina a veces sirve antes de
  -- registrar la compra, y un stock en rojo es informacion util, no
  -- un error que haya que ocultar.
  quantity      numeric(12,3) not null default 0,
  -- Umbral de reposicion. Por sucursal, porque el consumo varia.
  min_quantity  numeric(12,3) not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (branch_id, ingredient_id)
);

create index if not exists branch_stock_ingredient_idx
  on branch_stock (ingredient_id);

-- ── 3. Bitacora de movimientos ───────────────────────────
create table if not exists stock_movements (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branches(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  -- entrada: compra o devolucion   salida: consumo manual
  -- merma:   caducado o dañado     ajuste: correccion de conteo
  kind          text not null
                  check (kind in ('entrada','salida','merma','ajuste')),
  -- Siempre positivo salvo en 'ajuste', donde el signo indica la
  -- direccion de la correccion.
  quantity      numeric(12,3) not null,
  note          text not null default '',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists stock_movements_branch_idx
  on stock_movements (branch_id, created_at desc);

create index if not exists stock_movements_ingredient_idx
  on stock_movements (ingredient_id, created_at desc);

-- ── 4. El movimiento manda sobre la existencia ───────────
create or replace function apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(12,3);
begin
  if new.quantity = 0 then
    raise exception 'La cantidad del movimiento no puede ser cero';
  end if;

  -- Entrada suma; salida y merma restan; ajuste respeta su signo.
  delta := case new.kind
    when 'entrada' then abs(new.quantity)
    when 'salida'  then -abs(new.quantity)
    when 'merma'   then -abs(new.quantity)
    else new.quantity
  end;

  insert into branch_stock (branch_id, ingredient_id, quantity, updated_at)
  values (new.branch_id, new.ingredient_id, delta, now())
  on conflict (branch_id, ingredient_id) do update
    set quantity   = branch_stock.quantity + delta,
        updated_at = now();

  -- Deja constancia de quien lo hizo, sin confiar en el cliente.
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_apply_stock_movement on stock_movements;
create trigger trg_apply_stock_movement
  before insert on stock_movements
  for each row execute function apply_stock_movement();

-- Un movimiento es un hecho historico: no se edita ni se borra.
-- Para corregir se registra un 'ajuste' en sentido contrario.
create or replace function block_movement_rewrite()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los movimientos no se modifican. Registra un ajuste para corregir.';
end;
$$;

drop trigger if exists trg_block_movement_rewrite on stock_movements;
create trigger trg_block_movement_rewrite
  before update or delete on stock_movements
  for each row execute function block_movement_rewrite();

-- ── 5. Alta de sucursal: arranca con todo el catalogo ────
--  Sin esto, una sucursal nueva no mostraria ningun ingrediente
--  hasta su primer movimiento.
create or replace function seed_branch_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into branch_stock (branch_id, ingredient_id, quantity)
  select new.id, i.id, 0 from ingredients i where i.active = true
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_branch_stock on branches;
create trigger trg_seed_branch_stock
  after insert on branches
  for each row execute function seed_branch_stock();

-- Y al reves: un ingrediente nuevo aparece en todas las sucursales.
create or replace function seed_ingredient_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into branch_stock (branch_id, ingredient_id, quantity)
  select b.id, new.id from branches b
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_ingredient_stock on ingredients;
create trigger trg_seed_ingredient_stock
  after insert on ingredients
  for each row execute function seed_ingredient_stock();

-- Rellena las combinaciones que falten para lo que ya existe.
insert into branch_stock (branch_id, ingredient_id, quantity)
select b.id, i.id, 0
from branches b cross join ingredients i
on conflict do nothing;

-- ── 6. RLS ───────────────────────────────────────────────
alter table ingredients     enable row level security;
alter table branch_stock    enable row level security;
alter table stock_movements enable row level security;

-- El catalogo lo ve todo el staff; solo el admin lo edita, para que
-- una sucursal no invente ingredientes que las demas no conocen.
drop policy if exists "Staff reads ingredients" on ingredients;
create policy "Staff reads ingredients" on ingredients
  for select using (auth.uid() is not null);

drop policy if exists "Admin writes ingredients" on ingredients;
create policy "Admin writes ingredients" on ingredients
  for all using (is_admin()) with check (is_admin());

-- La existencia se lee y se escribe solo dentro del alcance del usuario.
drop policy if exists "Staff reads stock" on branch_stock;
create policy "Staff reads stock" on branch_stock
  for select using (can_reach(branch_id));

drop policy if exists "Staff writes stock" on branch_stock;
create policy "Staff writes stock" on branch_stock
  for all using (can_reach(branch_id)) with check (can_reach(branch_id));

drop policy if exists "Staff reads movements" on stock_movements;
create policy "Staff reads movements" on stock_movements
  for select using (can_reach(branch_id));

drop policy if exists "Staff inserts movements" on stock_movements;
create policy "Staff inserts movements" on stock_movements
  for insert with check (can_reach(branch_id));

-- ── 7. Vista de reposicion ───────────────────────────────
--  Lo que hay que comprar, por sucursal.
create or replace view stock_alerts as
select
  s.branch_id,
  b.name  as branch_name,
  i.id    as ingredient_id,
  i.name  as ingredient_name,
  i.unit,
  s.quantity,
  s.min_quantity,
  (s.min_quantity - s.quantity) as missing
from branch_stock s
join branches b    on b.id = s.branch_id
join ingredients i on i.id = s.ingredient_id
where i.active = true
  and s.quantity <= s.min_quantity
  and s.min_quantity > 0;

-- ── 8. Comprobacion ──────────────────────────────────────
--    select * from ingredients;
--    select * from stock_alerts;
