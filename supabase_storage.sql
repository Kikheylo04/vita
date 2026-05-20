-- ══════════════════════════════════════════════════════════
--  VITA Restaurant — Storage Setup
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ══════════════════════════════════════════════════════════

-- Crear bucket público para imágenes del menú
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,  -- 5 MB máximo por imagen
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict do nothing;

-- Lectura pública (cualquiera puede ver las imágenes)
create policy "Public read menu images" on storage.objects
  for select using (bucket_id = 'menu-images');

-- Solo admins autenticados pueden subir/eliminar
create policy "Admin upload menu images" on storage.objects
  for insert with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');

create policy "Admin delete menu images" on storage.objects
  for delete using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

create policy "Admin update menu images" on storage.objects
  for update using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
