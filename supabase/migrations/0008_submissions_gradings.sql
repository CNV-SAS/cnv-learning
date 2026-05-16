-- Migration: 0008_submissions_gradings
-- Why: submissions es la entrega del estudiante para un assignment. Es
-- polimorfica (essay_text para essay, storage_path para file_upload,
-- quiz_answers jsonb para quiz). status submission_status transita
-- draft -> submitted -> graded/returned. submitted_at se setea solo
-- cuando status pasa de draft a submitted (nullable hasta entonces).
-- Unique (assignment_id, user_id) previene doble entrega del mismo
-- estudiante al mismo assignment.
--
-- gradings es la calificacion final humana (DATABASE.md linea 282-287).
-- submission_id unique inline garantiza una sola calificacion por entrega.
-- ai_suggestion_id se declara aqui como uuid plano sin FK; la FK se
-- agrega en migracion 0009 cuando exista la tabla ai_grading_suggestions
-- (forward-reference resuelta, plan acordado en el plan general del bloque).
-- graded_by sin on delete cascade preserva la auditoria de quien califico
-- aunque el docente sea desactivado.

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  storage_path text,
  essay_text text,
  quiz_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create index submissions_user_idx on public.submissions(user_id);
create index submissions_assignment_idx on public.submissions(assignment_id);
create index submissions_status_idx on public.submissions(status);

create table public.gradings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  graded_by uuid not null references public.profiles(id),
  final_grade numeric not null,
  feedback text not null,
  ai_suggestion_id uuid,
  graded_at timestamptz not null default now()
);

create index gradings_graded_by_idx on public.gradings(graded_by);
