-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Mensajes de contacto
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ══════════════════════════════════════════════════════════

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text not null default '',
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

create policy "Public insert contact" on contact_messages
  for insert with check (true);

create policy "Admin full access contact" on contact_messages
  for all using (auth.role() = 'authenticated');
