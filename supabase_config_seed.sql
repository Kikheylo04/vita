-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Config seed
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Carga los valores iniciales del restaurante en la tabla config
-- ══════════════════════════════════════════════════════════

insert into config (key, value) values
  ('name',           'VITA'),
  ('full_name',      'VITA — Vera Italia Tavola Autentica'),
  ('tagline',        'Vera Italia Tavola Autentica'),
  ('founded_year',   '2009'),
  ('phone',          '(55) 1234-5678'),
  ('phone_raw',      '5512345678'),
  ('email',          'hola@vitarestaurante.mx'),
  ('address',        'Av. Presidente Masaryk 123'),
  ('neighborhood',   'Polanco'),
  ('city',           'CDMX'),
  ('city_full',      'Ciudad de México'),
  ('zip',            '11560'),
  ('maps_embed',     'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.661038875557!2d-99.19867492394963!3d19.432421581886825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d201f2e4e6b28f%3A0x4a501367f076b8a8!2sAv.%20Presidente%20Masaryk%2C%20Polanco%2C%20Miguel%20Hidalgo%2C%2011560%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses!2smx!4v1700000000000'),
  ('instagram',      'vita.restaurante'),
  ('instagram_url',  'https://instagram.com/vita.restaurante'),
  ('facebook_url',   'https://facebook.com/vitarestaurante'),
  ('chef_name',      'Marco Rossi'),
  ('chef_title',     'Chef & Fundador'),
  ('chef_title_en',  'Chef & Founder'),
  ('hours_lunch',    '13:00 – 16:00'),
  ('hours_dinner',   '20:00 – 23:00'),
  ('hours_note',     'Lunes cerrado'),
  ('hours_note_en',  'Closed on Mondays'),
  ('currency',       'MXN'),
  ('currency_symbol','$'),
  ('currency_locale','es-MX'),
  ('usd_rate',       '17')
on conflict (key) do update set value = excluded.value;
