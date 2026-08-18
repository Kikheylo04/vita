-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Pedidos anticipados
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ══════════════════════════════════════════════════════════

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  date        date not null,
  time        text not null,
  guests      integer not null default 1,
  notes       text not null default '',
  total       numeric(10,2) not null default 0,
  status      text not null default 'pending'
                check (status in ('pending','confirmed','ready','delivered','cancelled')),
  created_at  timestamptz not null default now()
);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  name        text not null,
  price       numeric(8,2) not null,
  quantity    integer not null default 1
);

-- RLS
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Public insert orders" on orders
  for insert with check (true);

create policy "Admin full access orders" on orders
  for all using (auth.role() = 'authenticated');

create policy "Public insert order_items" on order_items
  for insert with check (true);

create policy "Admin full access order_items" on order_items
  for all using (auth.role() = 'authenticated');
