-- Migration: 0023_rls_profile_course_peers
-- Why: cierra el gap RLS de profiles detectado tras el smoke del
-- Bloque 9. Las policies existentes cubrian: self (0017), admin
-- ve todo (0017), teacher ve students de sus cursos (0017),
-- student ve teachers de sus cursos (0021). Faltaba:
--   - student <-> student del mismo curso.
--   - teacher <-> teacher del mismo curso.
-- Sin estas policies el embedded join PostgREST en
-- threadRepository (profiles!forum_threads_author_id_fkey) volvia
-- null para esos cross-reads y la UI del foro crasheaba en
-- thread.author.role para roles distintos a admin. El hot-fix
-- a8483ba ya agrego defensa en codigo (fallback "(Sin perfil)");
-- esta migracion cierra el gap de fondo asi el fallback no se
-- dispara en operacion normal.
--
-- Defensa en profundidad con role = 'student' / 'teacher' en
-- el target (profiles.role): aunque las EXISTS chains via
-- enrollments / course_teachers ya restringen el conjunto, los
-- guards explicitos previenen rutas indirectas si en el futuro
-- un row no esperado aparece en esas tablas (mismo patron del
-- 0021).
--
-- Sin filtro is_active en enrollments para mantener consistencia
-- con la policy "Teachers can view enrolled students" del 0017:
-- un student desactivado temporalmente sigue siendo visible para
-- pares que ya vieron sus posts historicos. Si en v2 se requiere
-- aislar a desactivados, se modifica esta policy + la de 0017
-- juntas.

create policy "Enrolled students view course peers" on public.profiles
  for select using (
    role = 'student'
    and exists(
      select 1 from public.enrollments e_caller
      join public.enrollments e_target on e_target.course_id = e_caller.course_id
      where e_caller.user_id = auth.uid()
        and e_target.user_id = profiles.id
    )
  );

create policy "Teachers view fellow teachers" on public.profiles
  for select using (
    role = 'teacher'
    and exists(
      select 1 from public.course_teachers ct_caller
      join public.course_teachers ct_target on ct_target.course_id = ct_caller.course_id
      where ct_caller.teacher_id = auth.uid()
        and ct_target.teacher_id = profiles.id
    )
  );
