-- ============================================================
--  Depósito de archivos para tickets y comprobantes
--  Ejecutar completo en el editor SQL de Supabase.
--  Sin esto, ninguna subida de fotos funciona.
-- ============================================================

-- 1. El depósito. Público: la app muestra las imágenes por URL directa,
--    y los nombres de archivo son aleatorios e imposibles de adivinar.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do update set public = true;

-- 2. Permisos. Sin estas políticas el depósito existe pero rechaza todo.
drop policy if exists "comprobantes subir"      on storage.objects;
drop policy if exists "comprobantes leer"       on storage.objects;
drop policy if exists "comprobantes reemplazar" on storage.objects;
drop policy if exists "comprobantes borrar"     on storage.objects;

create policy "comprobantes subir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes');

create policy "comprobantes leer" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes');

create policy "comprobantes reemplazar" on storage.objects
  for update to authenticated
  using (bucket_id = 'comprobantes');

create policy "comprobantes borrar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes');

-- Para comprobar que quedó:
--   select id, public from storage.buckets where id = 'comprobantes';
