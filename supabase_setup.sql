-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Supabase Setup
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ══════════════════════════════════════════════════════════

-- ── Reservaciones ─────────────────────────────────────────
create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  date        date not null,
  time        text not null,
  guests      integer not null default 2,
  notes       text default '',
  status      text not null default 'pending'
                check (status in ('pending','confirmed','cancelled')),
  created_at  timestamptz not null default now()
);

-- ── Menú ──────────────────────────────────────────────────
create table if not exists menu_items (
  id          uuid primary key default gen_random_uuid(),
  cat         text not null,
  name        text not null,
  description     text not null default '',
  description_en  text not null default '',
  price       numeric(8,2) not null default 0,
  badge       text not null default '',
  image       text not null default '',
  active      boolean not null default true,
  sort_order  integer not null default 0
);

-- ── Testimonios ───────────────────────────────────────────
create table if not exists testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null default '',
  avatar      text not null default '',
  rating      integer not null default 5
                check (rating between 1 and 5),
  comment     text not null,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

-- ── Eventos ───────────────────────────────────────────────
create table if not exists events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  title_en        text not null default '',
  date            date not null,
  description     text not null default '',
  description_en  text not null default '',
  image_url       text not null default '',
  active          boolean not null default true
);

-- ── Configuración ─────────────────────────────────────────
create table if not exists config (
  key    text primary key,
  value  text not null default ''
);

-- ── Row Level Security ────────────────────────────────────
-- Reservaciones: lectura/escritura solo para usuarios autenticados (admin)
-- Escritura pública para el formulario del sitio web
alter table reservations enable row level security;

create policy "Public insert reservations" on reservations
  for insert with check (true);

create policy "Admin full access reservations" on reservations
  for all using (auth.role() = 'authenticated');

-- Menú: lectura pública, escritura solo admin
alter table menu_items enable row level security;

create policy "Public read menu" on menu_items
  for select using (active = true);

create policy "Admin full access menu" on menu_items
  for all using (auth.role() = 'authenticated');

-- Testimonios: inserción pública, gestión solo admin
alter table testimonials enable row level security;

create policy "Public insert testimonials" on testimonials
  for insert with check (true);

create policy "Public read approved testimonials" on testimonials
  for select using (status = 'approved');

create policy "Admin full access testimonials" on testimonials
  for all using (auth.role() = 'authenticated');

-- Eventos: lectura pública activos, gestión solo admin
alter table events enable row level security;

create policy "Public read active events" on events
  for select using (active = true);

create policy "Admin full access events" on events
  for all using (auth.role() = 'authenticated');

-- Config: lectura pública, escritura solo admin
alter table config enable row level security;

create policy "Public read config" on config
  for select using (true);

create policy "Admin full access config" on config
  for all using (auth.role() = 'authenticated');

-- ── Datos iniciales del menú ──────────────────────────────
insert into menu_items (cat, name, description, description_en, price, badge, image, sort_order) values
('Entradas', 'Bruschetta al Pomodoro',         'Pan tostado con tomate fresco, albahaca y aceite de oliva virgen extra.',         'Toasted bread with fresh tomato, basil and extra virgin olive oil.',                    4.99, '',           'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&auto=format&fit=crop&q=80', 1),
('Entradas', 'Carpaccio di Manzo',             'Finas láminas de res con rúcula, parmesano y alcaparras.',                        'Thin slices of beef with arugula, parmesan and capers.',                               8.99, 'Popular',    'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&auto=format&fit=crop&q=80', 2),
('Entradas', 'Burrata Fresca',                 'Burrata cremosa con tomates cherry, pesto de albahaca y reducción de balsámico.', 'Creamy burrata with cherry tomatoes, basil pesto and balsamic reduction.',              9.99, '',           'https://images.unsplash.com/photo-1595587637401-83ff822bd63e?w=400&auto=format&fit=crop&q=80', 3),
('Pastas',   'Tagliatelle al Ragù',            'Pasta fresca artesanal con ragù de res y cerdo cocinado 6 horas.',               'Artisan fresh pasta with beef and pork ragù slow-cooked for 6 hours.',                 11.99, 'Chef''s Choice', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&auto=format&fit=crop&q=80', 4),
('Pastas',   'Pappardelle ai Funghi',          'Pasta ancha con mix de hongos silvestres, trufa negra y parmesano.',             'Wide pasta with wild mushroom mix, black truffle and parmesan.',                       13.99, '',           'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&auto=format&fit=crop&q=80', 5),
('Pastas',   'Risotto al Tartufo',             'Arroz carnaroli cremoso con trufa blanca de temporada.',                         'Creamy carnaroli rice with seasonal white truffle.',                                   16.99, 'Temporada',  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80', 6),
('Carnes',   'Bistecca alla Fiorentina',       'Corte T-Bone de 500g con guarnición de papas al romero y ensalada.',            '500g T-Bone cut with rosemary potatoes and salad.',                                    28.99, 'Signature',  'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=80', 7),
('Carnes',   'Osso Buco alla Milanese',        'Jarrete de ternera braseado lentamente con gremolata y risotto.',               'Slowly braised veal shank with gremolata and risotto.',                                21.99, '',           'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80', 8),
('Mariscos', 'Branzino al Sale',               'Lubina entera a la sal con verduras de temporada y limón siciliano.',           'Whole salt-baked sea bass with seasonal vegetables and Sicilian lemon.',               20.99, '',           'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&auto=format&fit=crop&q=80', 9),
('Mariscos', 'Salmone in Crosta',              'Salmón en costra de hierbas con puré de coliflor y salsa beurre blanc.',       'Herb-crusted salmon with cauliflower purée and beurre blanc sauce.',                   17.99, 'Popular',    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&auto=format&fit=crop&q=80', 10),
('Postres',  'Tiramisù della Casa',            'Receta familiar con mascarpone artesanal, café espresso y cacao.',              'Family recipe with artisan mascarpone, espresso coffee and cocoa.',                    6.99, '',           'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop&q=80', 11),
('Postres',  'Panna Cotta ai Frutti di Bosco', 'Crema italiana con coulis de frutos rojos y menta fresca.',                    'Italian cream dessert with mixed berry coulis and fresh mint.',                         5.99, '',           'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80', 12),
('Bebidas',  'Vino de la Casa',                'Sangiovese toscano, botella 750ml.',                                            'Tuscan Sangiovese, 750ml bottle.',                                                     20.99, '',           'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80', 13),
('Bebidas',  'Agua Mineral',                   'Con gas o sin gas, 500ml.',                                                    'Still or sparkling, 500ml.',                                                           2.99, '',           'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&auto=format&fit=crop&q=80', 14)
on conflict do nothing;
