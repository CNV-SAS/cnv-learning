-- Migration: 0034_storage_policies_hardening
-- Why: Bloque 23.3. Endurece las storage policies de 2 buckets
-- expuestos demasiado en el MVP:
--
-- 1) avatars: la policy "Avatars are publicly accessible" daba
--    SELECT abierto a TODOS los avatars de TODOS los usuarios.
--    Aunque el bucket es public=true (las URLs CDN bypasean RLS),
--    el endpoint LIST y el authenticated SELECT estaban expuestos.
--    La nueva policy restringe a la carpeta del propio user (mismo
--    patron que submissions). Las URLs publicas via getPublicUrl()
--    siguen funcionando porque NO pasan por RLS.
--
-- 2) submissions: la policy "Teachers read submissions of their
--    courses" usaba current_user_role() in ('teacher', 'admin')
--    SIN filtrar por curso. Cualquier teacher podia leer cualquier
--    submission del sistema (simplificacion intencional del MVP,
--    ver comentario en 0015). La nueva policy joinea contra la
--    tabla submissions filtrando por is_course_teacher(course_id).
--    Admin lee todas via policy separada para audit.
--
-- Pre-check 23.3.a confirmo que el codigo no se rompe:
--   - upload usa endpoint INSERT (policy intacta, "Users upload own").
--   - render usa CDN publico (bypassea RLS).
--   - delete usa admin client (bypassea RLS).
--   - status panel usa admin client (bypassea RLS).
--   - no hay codigo que muestre avatares de otros users.

-- ============================================================
-- avatars: restringir SELECT a la carpeta del propio user
-- ============================================================
drop policy if exists "Avatars are publicly accessible" on storage.objects;

create policy "Users list own avatars" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- submissions: filtrar correctamente por curso del teacher
-- ============================================================
drop policy if exists "Teachers read submissions of their courses" on storage.objects;

create policy "Teachers read submissions of their courses" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.storage_path = name
        and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins read all submissions" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and public.current_user_role() = 'admin'
  );
