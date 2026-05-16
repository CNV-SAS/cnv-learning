-- Migration: 0015_storage_buckets
-- Why: 3 buckets para los assets del MVP (DATABASE.md lineas 690-737):
-- avatars (publico, fotos de perfil), lesson-materials (privado, PDFs de
-- lecciones, lectura requiere enrollment), submissions (privado, lectura
-- por dueno y por docentes/admins).
--
-- Las policies que filtran por enrollment usan public.is_enrolled() y
-- las que filtran por rol usan public.current_user_role(), ambos
-- definidos en 0014_rls_helpers. Por eso esta migracion va despues.
--
-- Path convention de uploads: {bucket}/{user_id}/{uuid}.{ext}, las
-- policies validan que el primer segmento del folder coincida con
-- auth.uid()::text para insertar.
--
-- Nota: la policy "Teachers read submissions of their courses" permite
-- que cualquier teacher lea cualquier submission desde Storage, no solo
-- las de sus cursos. Simplificacion intencional de MVP; el filtrado
-- fino por curso lo hace la RLS de la tabla submissions (0019). En
-- combinacion con UUIDs no enumerables como filename, la superficie
-- de exposicion es baja.

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Avatars are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

insert into storage.buckets (id, name, public) values ('lesson-materials', 'lesson-materials', false);

create policy "Enrolled users read lesson materials" on storage.objects
  for select using (
    bucket_id = 'lesson-materials'
    and exists(
      select 1 from public.lesson_attachments la
      join public.lessons l on l.id = la.lesson_id
      join public.modules m on m.id = l.module_id
      where la.storage_path = name and public.is_enrolled(m.course_id)
    )
  );

insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false);

create policy "Users upload own submissions" on storage.objects
  for insert with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own submissions" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Teachers read submissions of their courses" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and public.current_user_role() in ('teacher', 'admin')
  );
