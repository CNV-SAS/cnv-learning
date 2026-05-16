-- Migration: 0019_rls_submissions
-- Why: enable RLS + policies para 3 tablas: submissions, gradings,
-- ai_grading_suggestions. Es la capa sensible donde estudiantes,
-- docentes y admin tienen visibilidades distintas. submissions usa
-- las 5 policies literales de DATABASE.md (606-630). gradings usa
-- 3 literales + 2 inferidas (gaps del doc: faltaba teacher view y
-- admin view, sin ellas el panel docente y admin se romperian).
-- ai_grading_suggestions es total inferencia (el doc no especifica
-- policies): teachers crean y leen sugerencias de SUS cursos, admin
-- ve todo, estudiantes nada. Decisiones aprobadas por Santiago.

-- ============================================================
-- submissions (DATABASE.md 606-630, literal)
-- ============================================================
alter table public.submissions enable row level security;

create policy "Students view own submissions" on public.submissions
  for select using (user_id = auth.uid());

create policy "Students create own submissions" on public.submissions
  for insert with check (user_id = auth.uid());

create policy "Students update own draft submissions" on public.submissions
  for update using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());

create policy "Teachers view submissions of their courses" on public.submissions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = submissions.assignment_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all submissions" on public.submissions
  for select using (public.current_user_role() = 'admin');

-- Sin admin UPDATE/DELETE: si admin necesita modificar, va via service role.

-- ============================================================
-- gradings (3 literal DATABASE.md 634-659 + 2 inferidas)
-- ============================================================
alter table public.gradings enable row level security;

create policy "Students view gradings of own submissions" on public.gradings
  for select using (
    exists(
      select 1 from public.submissions s
      where s.id = gradings.submission_id and s.user_id = auth.uid()
    )
  );

create policy "Teachers create gradings for their courses" on public.gradings
  for insert with check (
    graded_by = auth.uid()
    and exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = gradings.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Teachers update own gradings" on public.gradings
  for update using (graded_by = auth.uid())
  with check (graded_by = auth.uid());

-- Inferidas (gaps del doc, aprobadas):
create policy "Teachers view gradings of their courses" on public.gradings
  for select using (
    exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = gradings.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all gradings" on public.gradings
  for select using (public.current_user_role() = 'admin');

-- ============================================================
-- ai_grading_suggestions (3 policies inferidas, doc no especifica)
-- ============================================================
alter table public.ai_grading_suggestions enable row level security;

create policy "Teachers create AI suggestions for their courses" on public.ai_grading_suggestions
  for insert with check (
    generated_by = auth.uid()
    and exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = ai_grading_suggestions.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Teachers view AI suggestions for their courses" on public.ai_grading_suggestions
  for select using (
    exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = ai_grading_suggestions.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all AI suggestions" on public.ai_grading_suggestions
  for select using (public.current_user_role() = 'admin');

-- Sin UPDATE/DELETE: las sugerencias son inmutables por diseno (sin
-- updated_at en la tabla). Regenerar crea otra fila. Estudiantes sin
-- SELECT: solo ven la grading.feedback final humana.
