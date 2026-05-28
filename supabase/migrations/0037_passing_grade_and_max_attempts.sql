-- Migration: 0037_passing_grade_and_max_attempts
-- Why: introduce el modelo de "tarea aprobada" para el calculo de
-- progreso del curso. Hasta ahora una tarea con status='submitted'
-- ya contaba para el progreso, sin importar si el alumno la aprobo
-- realmente. Con esta migracion:
--
--   1. courses.passing_grade: porcentaje del max_score requerido
--      para considerar aprobada una tarea (default 70.0). Aplica
--      a todas las tareas con is_required=true del curso.
--   2. assignments.max_attempts: cuantos intentos puede hacer el
--      alumno antes de que la tarea quede como "reprobada
--      definitivamente". 0 = ilimitados.
--   3. submissions: modelo cambia de "una row por (assignment, user)"
--      a "una row por (assignment, user, attempt_number)" para
--      preservar historico de intentos. Drop del unique anterior,
--      add unique compuesto con attempt_number.
--
-- Decisiones del analisis (post-23 ISSUE 3):
--   Q1: una row por intento.
--   Q2: solo submitted cuenta como intento (draft no consume).
--   Q3: solo el ultimo intento es calificable.
--   Q4: aprobada = locked (no puede reintentar).
--   Q5: passing_grade aplica a todas las tareas obligatorias.
--   Q6: sin cambios retroactivos (cohorte de prueba).
--   Q7: graded_at para timeline de ranks.
--
-- Backward compat: submissions existentes preservan
-- attempt_number=1 por el default. Si el cohorte de prueba tiene
-- submissions previas en draft o submitted, todas quedan etiquetadas
-- como su unico intento, y la siguiente entrega del alumno crea
-- attempt 2 si el modelo lo permite.

-- ============================================================
-- 1) courses.passing_grade
-- ============================================================
alter table public.courses
  add column passing_grade numeric(5,2) not null default 70.0,
  add constraint courses_passing_grade_range
    check (passing_grade >= 0 and passing_grade <= 100);

comment on column public.courses.passing_grade is
  'Porcentaje del max_score requerido para considerar aprobada una tarea. Aplica a todas las tareas con is_required=true. 70.0 = "70%". 0 = cualquier nota aprueba.';

-- ============================================================
-- 2) assignments.max_attempts
-- ============================================================
alter table public.assignments
  add column max_attempts integer not null default 0,
  add constraint assignments_max_attempts_nonneg
    check (max_attempts >= 0);

comment on column public.assignments.max_attempts is
  'Maximo de intentos permitidos al alumno. 0 = ilimitados. N > 0 = el alumno solo puede entregar N veces; si la N-esima entrega no aprueba, la tarea queda reprobada definitivamente.';

-- ============================================================
-- 3) submissions multi-attempt
-- ============================================================
-- Agregamos attempt_number ANTES de cambiar el unique para que las
-- rows existentes queden con attempt_number=1 por el default y
-- satisfagan el nuevo unique compuesto.
alter table public.submissions
  add column attempt_number integer not null default 1,
  add constraint submissions_attempt_number_positive
    check (attempt_number >= 1);

comment on column public.submissions.attempt_number is
  'Numero de intento. La primera entrega es 1; cada nueva submission del mismo (assignment, user) tras agotar un intento crea attempt_number+1. Solo el intento mas reciente es calificable (decision Q3 del analisis).';

-- Drop del unique viejo + add compuesto.
alter table public.submissions
  drop constraint submissions_assignment_id_user_id_key;

alter table public.submissions
  add constraint submissions_assignment_user_attempt_unique
    unique (assignment_id, user_id, attempt_number);

-- ============================================================
-- 4) Index helper para encontrar el ultimo intento rapido
-- ============================================================
-- Query patron: "ultimo intento del user para esta assignment".
-- order by attempt_number desc limit 1. El unique compuesto ya
-- crea indice util, pero un index dedicado descending hace el
-- limit 1 explicito sin ordering en memoria.
create index submissions_latest_attempt_idx
  on public.submissions (assignment_id, user_id, attempt_number desc);
