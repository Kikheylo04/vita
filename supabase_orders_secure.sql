-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Blindaje de precios en pedidos
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
--  Problema que resuelve:
--  order_items acepta inserts anonimos con el precio que
--  mande el navegador. Cualquiera puede abrir DevTools y
--  crear un pedido de $1. Estos triggers reescriben el
--  precio desde menu_items y recalculan el total, de modo
--  que lo que mande el cliente se ignora.
-- ══════════════════════════════════════════════════════════

-- ── 1. Vincular order_items con el platillo real ─────────
alter table order_items
  add column if not exists menu_item_id uuid references menu_items(id);

-- ── 2. El precio SIEMPRE viene de menu_items ─────────────
create or replace function set_order_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  real_price numeric(8,2);
  real_name  text;
begin
  if new.menu_item_id is null then
    raise exception 'menu_item_id es obligatorio';
  end if;

  select price, name into real_price, real_name
  from menu_items
  where id = new.menu_item_id and active = true;

  if not found then
    raise exception 'El platillo % no existe o no esta disponible', new.menu_item_id;
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

drop trigger if exists trg_order_item_price on order_items;
create trigger trg_order_item_price
  before insert or update on order_items
  for each row execute function set_order_item_price();

-- ── 3. El total SIEMPRE se recalcula desde los renglones ──
create or replace function recalc_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order uuid := coalesce(new.order_id, old.order_id);
begin
  update orders
  set total = coalesce((
    select sum(price * quantity)
    from order_items
    where order_id = target_order
  ), 0)
  where id = target_order;

  return null;
end;
$$;

drop trigger if exists trg_recalc_order_total on order_items;
create trigger trg_recalc_order_total
  after insert or update or delete on order_items
  for each row execute function recalc_order_total();

-- ── 4. El total que manda el cliente se descarta ──────────
--  Entra en 0 y el trigger de arriba lo corrige al insertar
--  los renglones.
create or replace function reset_order_total()
returns trigger
language plpgsql
as $$
begin
  new.total := 0;
  return new;
end;
$$;

drop trigger if exists trg_reset_order_total on orders;
create trigger trg_reset_order_total
  before insert on orders
  for each row execute function reset_order_total();

-- ── 5. Impedir que el cliente se auto-confirme el pedido ──
--  La politica publica permitia mandar cualquier status.
drop policy if exists "Public insert orders" on orders;
create policy "Public insert orders" on orders
  for insert with check (status = 'pending');
