-- Migration: 0021_rls_students_view_teachers
-- Why: cierra el gap detectado en sub-bloque 1.22 (smoke test RLS).
-- Un estudiante enrolled veia public.course_teachers (sabia que existia
-- un teacher_id asignado a su curso) pero no podia leer el profile
-- correspondiente del teacher (full_name, avatar_url, bio). La UI del
-- Bloque 4 (vista del curso) mostraria teacher_id raw en vez de
-- informacion util como "Tu docente: {full_name}".
--
-- Esta policy agrega la cuarta combinacion logica de visibilidad sobre
-- profiles (despues de self, admin, teacher-of-enrolled-students):
-- student-of-this-teacher.
--
-- Defensa en profundidad con role = 'teacher': aunque la EXISTS chain
-- ya restringe via course_teachers (que solo enlaza con teachers en
-- la practica), el guard explicito previene rutas indirectas futuras
-- donde un row no-teacher acabe expuesto por la policy.

create policy "Enrolled students view their course teachers" on public.profiles
  for select using (
    role = 'teacher'
    and exists(
      select 1 from public.course_teachers ct
      join public.enrollments e on e.course_id = ct.course_id
      where ct.teacher_id = profiles.id and e.user_id = auth.uid()
    )
  );
