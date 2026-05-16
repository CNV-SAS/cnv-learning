-- Migration: 0018_rls_enrollments_assignments
-- Why: enable RLS + policies para 5 tablas. enrollments usa policies
-- literales de DATABASE.md (lineas 561-576). lesson_progress, assignments,
-- quiz_questions usan policies inferidas siguiendo el patron de lessons
-- (aprobadas por Santiago). quiz_options usa modelo "server-only access
-- para estudiantes" por su columna is_correct secreta: estudiantes sin
-- policy SELECT, acceso desde quiz player via route handler backend con
-- service role (Bloque 7).

-- ============================================================
-- enrollments (DATABASE.md 561-576, literal)
-- ============================================================
alter table public.enrollments enable row level security;

create policy "Users view own enrollments" on public.enrollments
  for select using (user_id = auth.uid());

create policy "Teachers view enrollments of their courses" on public.enrollments
  for select using (public.is_course_teacher(course_id));

create policy "Admins view all enrollments" on public.enrollments
  for select using (public.current_user_role() = 'admin');

create policy "Admins manage enrollments" on public.enrollments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- lesson_progress (4 policies inferidas)
-- ============================================================
alter table public.lesson_progress enable row level security;

create policy "Users view own progress" on public.lesson_progress
  for select using (user_id = auth.uid());

create policy "Teachers view progress of their course students" on public.lesson_progress
  for select using (
    exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all progress" on public.lesson_progress
  for select using (public.current_user_role() = 'admin');

create policy "Users mark own lesson progress" on public.lesson_progress
  for insert with check (
    user_id = auth.uid()
    and exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id and public.is_enrolled(m.course_id)
    )
  );

-- ============================================================
-- assignments (3 policies inferidas, patron de lessons)
-- ============================================================
alter table public.assignments enable row level security;

create policy "Enrolled students view assignments of their courses" on public.assignments
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view assignments of their courses" on public.assignments
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage assignments" on public.assignments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- quiz_questions (3 policies inferidas, patron de assignments)
-- ============================================================
alter table public.quiz_questions enable row level security;

create policy "Enrolled students view quiz questions" on public.quiz_questions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view quiz questions" on public.quiz_questions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage quiz_questions" on public.quiz_questions
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- quiz_options (2 policies, sin SELECT para estudiantes)
-- ============================================================
-- DECISION ARQUITECTONICA aprobada por Santiago: is_correct es campo
-- secreto. Postgres RLS no permite restriccion por columna, asi que
-- estudiantes quedan sin policy SELECT (acceso bloqueado). El quiz
-- player en Bloque 7 accede via route handler server-side que usa
-- service role para leer las opciones y filtra is_correct antes de
-- enviar al cliente.

alter table public.quiz_options enable row level security;

create policy "Teachers view options of their course quizzes" on public.quiz_options
  for select using (
    exists(
      select 1 from public.quiz_questions q
      join public.assignments a on a.id = q.assignment_id
      join public.modules m on m.id = a.module_id
      where q.id = quiz_options.question_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage quiz_options" on public.quiz_options
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
