-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Fase C: recetas y descuento automatico
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_inventory.sql (Fase B)
--
--  Modelo:
--  Cada platillo lleva una receta (que ingredientes y cuanto de
--  cada uno). Cuando un pedido pasa a 'ready', se descuenta del
--  stock de SU sucursal lo que consumieron sus renglones.
--
--  Decisiones tomadas con el cliente:
--  · Se descuenta al marcar el pedido como LISTO, no al confirmarlo.
--    Refleja lo que la cocina realmente uso, no lo prometido.
--  · Si no alcanza el stock, la venta NO se bloquea: el inventario
--    queda en negativo y el panel lo marca. Un conteo desactualizado
--    no debe frenar una venta real.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Receta: platillo -> ingredientes ──────────────────
create table if not exists recipe_items (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  -- Cantidad por UNA porcion, en la unidad del ingrediente.
  quantity      numeric(12,3) not null check (quantity > 0),
  created_at    timestamptz not null default now(),
  unique (menu_item_id, ingredient_id)
);

create index if not exists recipe_items_menu_idx on recipe_items (menu_item_id);
create index if not exists recipe_items_ing_idx  on recipe_items (ingredient_id);

-- ── 2. Marca de consumo en el pedido ─────────────────────
--  Evita el doble descuento si alguien mueve el estado de 'ready'
--  a otro y de vuelta.
alter table orders
  add column if not exists stock_consumed_at timestamptz;

-- ── 3. Motivo del movimiento ─────────────────────────────
--  El consumo automatico se distingue de una salida manual, y se
--  puede rastrear hasta el pedido que lo origino.
alter table stock_movements
  add column if not exists order_id uuid references orders(id) on delete set null;

create index if not exists stock_movements_order_idx
  on stock_movements (order_id) where order_id is not null;

-- El tipo 'consumo' se suma a los que ya existian.
alter table stock_movements drop constraint if exists stock_movements_kind_check;
alter table stock_movements add constraint stock_movements_kind_check
  check (kind in ('entrada','salida','merma','ajuste','consumo'));

-- 'consumo' resta, igual que salida y merma.
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

  delta := case new.kind
    when 'entrada' then abs(new.quantity)
    when 'salida'  then -abs(new.quantity)
    when 'merma'   then -abs(new.quantity)
    when 'consumo' then -abs(new.quantity)
    else new.quantity
  end;

  insert into branch_stock (branch_id, ingredient_id, quantity, updated_at)
  values (new.branch_id, new.ingredient_id, delta, now())
  on conflict (branch_id, ingredient_id) do update
    set quantity   = branch_stock.quantity + delta,
        updated_at = now();

  new.created_by := auth.uid();
  return new;
end;
$$;

-- ── 4. Descuento al marcar el pedido como listo ──────────
create or replace function consume_stock_on_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Solo en la transicion hacia 'ready', y solo una vez por pedido.
  if new.status is distinct from 'ready' then return new; end if;
  if old.status = 'ready' then return new; end if;
  if new.stock_consumed_at is not null then return new; end if;

  -- Suma lo que consume cada ingrediente entre todos los renglones:
  -- si dos platillos distintos llevan pasta, se descuenta una sola vez.
  for r in
    select ri.ingredient_id, sum(ri.quantity * oi.quantity) as total
    from order_items oi
    join recipe_items ri on ri.menu_item_id = oi.menu_item_id
    where oi.order_id = new.id
    group by ri.ingredient_id
  loop
    -- El insert dispara apply_stock_movement, que actualiza la
    -- existencia. Se permite que quede negativa a proposito.
    insert into stock_movements
      (branch_id, ingredient_id, kind, quantity, note, order_id)
    values
      (new.branch_id, r.ingredient_id, 'consumo', r.total,
       'Pedido de ' || coalesce(new.name, 'cliente'), new.id);
  end loop;

  new.stock_consumed_at := now();
  return new;
end;
$$;

drop trigger if exists trg_consume_stock_on_ready on orders;
create trigger trg_consume_stock_on_ready
  before update on orders
  for each row execute function consume_stock_on_ready();

-- ── 5. Devolucion al cancelar un pedido ya consumido ─────
--  Si se cancela despues de haber descontado, el ingrediente
--  vuelve al stock. Sin esto el inventario se desangra.
create or replace function restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status is distinct from 'cancelled' then return new; end if;
  if old.stock_consumed_at is null then return new; end if;

  for r in
    select ri.ingredient_id, sum(ri.quantity * oi.quantity) as total
    from order_items oi
    join recipe_items ri on ri.menu_item_id = oi.menu_item_id
    where oi.order_id = new.id
    group by ri.ingredient_id
  loop
    insert into stock_movements
      (branch_id, ingredient_id, kind, quantity, note, order_id)
    values
      (new.branch_id, r.ingredient_id, 'entrada', r.total,
       'Devolucion por cancelacion', new.id);
  end loop;

  new.stock_consumed_at := null;
  return new;
end;
$$;

drop trigger if exists trg_restore_stock_on_cancel on orders;
create trigger trg_restore_stock_on_cancel
  before update on orders
  for each row execute function restore_stock_on_cancel();

-- ── 6. RLS ───────────────────────────────────────────────
alter table recipe_items enable row level security;

-- La receta la consulta todo el staff: la cocina necesita verla.
drop policy if exists "Staff reads recipes" on recipe_items;
create policy "Staff reads recipes" on recipe_items
  for select using (auth.uid() is not null);

-- Solo el admin la edita: define el costo del platillo en todas
-- las sucursales.
drop policy if exists "Admin writes recipes" on recipe_items;
create policy "Admin writes recipes" on recipe_items
  for all using (is_admin()) with check (is_admin());

-- El consumo automatico corre en security definer, asi que la
-- politica de insert de movimientos no le estorba.

-- ── 7. Costo teorico por platillo ────────────────────────
--  Lo que cuesta producir cada platillo segun su receta. Comparado
--  con su precio da el margen real.
create or replace view menu_item_costs as
select
  m.id            as menu_item_id,
  m.name,
  m.price,
  coalesce(sum(ri.quantity * i.cost), 0) as cost,
  case
    when m.price > 0
      then round(((m.price - coalesce(sum(ri.quantity * i.cost), 0)) / m.price) * 100, 1)
    else 0
  end as margin_pct,
  count(ri.id)    as ingredient_count
from menu_items m
left join recipe_items ri on ri.menu_item_id = m.id
left join ingredients i   on i.id = ri.ingredient_id
group by m.id, m.name, m.price;

-- ── 8. Cuantas porciones alcanzan con el stock actual ────
--  Por sucursal: el ingrediente mas escaso limita el platillo.
create or replace view menu_item_availability as
select
  b.id   as branch_id,
  b.name as branch_name,
  m.id   as menu_item_id,
  m.name as menu_item_name,
  floor(min(bs.quantity / ri.quantity)) as portions_available
from menu_items m
join recipe_items ri on ri.menu_item_id = m.id
cross join branches b
join branch_stock bs
  on bs.branch_id = b.id and bs.ingredient_id = ri.ingredient_id
where m.active = true and b.active = true
group by b.id, b.name, m.id, m.name;

-- ── 9. Comprobacion ──────────────────────────────────────
--    select * from menu_item_costs order by margin_pct;
--    select * from menu_item_availability where portions_available < 5;
