-- Migration: 0033_quiz_teacher_manage
-- Why: Bloque 23.2. Habilita que los teachers asignados a un curso
-- gestionen las quiz_questions y quiz_options de sus cursos (CRUD
-- completo). Hasta ahora solo admin podia editar quiz (DATABASE.md
-- decia "v1.2"); con el editor de UI del Bloque 23.2.c los teachers
-- ya pueden cargar quizzes en sus propios cursos.
--
-- 3 cambios:
-- 1) ALTER quiz_questions ADD updated_at + trigger (decision Q7 plan
--    B23). Antes era inmutable; ahora se edita el texto sin necesidad
--    de DELETE + INSERT. quiz_options se queda sin updated_at: las
--    opciones se versionan a traves de la pregunta padre.
-- 2) Policies "Teachers manage X of their courses" sobre quiz_questions
--    y quiz_options. Mismo patron del 0027 (modules): JOIN contra
--    assignments + modules para llegar al course_id y aplicar
--    is_course_teacher(course_id). Defense-in-depth con la app layer
--    que ya verifica canEditCourseContent.
-- 3) RPC swap_quiz_question_positions (mismo patron que
--    swap_module_positions del 0027). El unique (assignment_id,
--    position) requiere el sentinel -1 para hacer el swap atomico
--    sin pisar la constraint mid-statement.
--
-- Las policies "Admins manage" de quiz_questions y quiz_options
-- (migracion 0017) siguen intactas; las nuevas son aditivas.

-- ============================================================
-- 1) updated_at en quiz_questions
-- ============================================================
alter table public.quiz_questions
  add column updated_at timestamptz not null default now();

create trigger set_updated_at_quiz_questions
  before update on public.quiz_questions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) RLS policies para teachers sobre quiz_questions + quiz_options
-- ============================================================
create policy "Teachers manage quiz_questions of their courses"
  on public.quiz_questions
  for all using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id
        and public.is_course_teacher(m.course_id)
    )
  )
  with check (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id
        and public.is_course_teacher(m.course_id)
    )
  );

create policy "Teachers manage quiz_options of their courses"
  on public.quiz_options
  for all using (
    exists(
      select 1 from public.quiz_questions q
      join public.assignments a on a.id = q.assignment_id
      join public.modules m on m.id = a.module_id
      where q.id = quiz_options.question_id
        and public.is_course_teacher(m.course_id)
    )
  )
  with check (
    exists(
      select 1 from public.quiz_questions q
      join public.assignments a on a.id = q.assignment_id
      join public.modules m on m.id = a.module_id
      where q.id = quiz_options.question_id
        and public.is_course_teacher(m.course_id)
    )
  );

-- ============================================================
-- 3) RPC swap_quiz_question_positions
-- ============================================================
-- Mismo patron que swap_module_positions (0027): el unique
-- (assignment_id, position) se chequea statement-end, por lo que un
-- UPDATE A.position = B.position falla porque B aun lo tiene. Usamos
-- el sentinel -1 (quiz_questions.position es int sin CHECK >= 1) en
-- 3 UPDATEs dentro de una funcion plpgsql atomica. SECURITY INVOKER
-- preserva las RLS del caller (admin o teacher con asignacion).
create or replace function public.swap_quiz_question_positions(
  p_assignment_id uuid,
  p_pos_a int,
  p_pos_b int
)
returns void
language plpgsql
security invoker
as $$
begin
  if p_pos_a = p_pos_b then
    return;
  end if;

  update public.quiz_questions
    set position = -1
    where assignment_id = p_assignment_id and position = p_pos_a;

  update public.quiz_questions
    set position = p_pos_a
    where assignment_id = p_assignment_id and position = p_pos_b;

  update public.quiz_questions
    set position = p_pos_b
    where assignment_id = p_assignment_id and position = -1;
end;
$$;
