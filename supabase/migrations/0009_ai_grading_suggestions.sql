-- Migration: 0009_ai_grading_suggestions
-- Why: persistimos cada sugerencia IA con provider/model/prompt_version
-- para trazabilidad y observabilidad (DATABASE.md lineas 298-324,
-- ARCHITECTURE.md regla dura 9). Permite comparar prompts versionados
-- y diagnosticar timeouts/parse_failed sin perder contexto. Una entrega
-- puede tener varias sugerencias (cada regenerar crea una nueva fila).
--
-- status es text (no enum) para extensibilidad de estados sin migracion;
-- los valores semanticos validos quedan documentados en el comment.
-- generated_by sin on delete cascade preserva el historial aunque el
-- docente sea desactivado.
--
-- Cierra el forward-reference de la migracion 0008 agregando la FK
-- gradings.ai_suggestion_id -> ai_grading_suggestions.id (default no_action,
-- previene borrado de una sugerencia que aun esta enlazada a una nota final).

create table public.ai_grading_suggestions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  generated_by uuid not null references public.profiles(id),
  provider text not null,
  model text not null,
  prompt_version text not null,
  suggested_grade numeric,
  generated_feedback text,
  raw_response jsonb,
  status text not null,
  latency_ms int,
  cost_tokens int,
  generated_at timestamptz not null default now()
);

create index ai_suggestions_submission_idx on public.ai_grading_suggestions(submission_id);
create index ai_suggestions_generated_by_idx on public.ai_grading_suggestions(generated_by);

comment on column public.ai_grading_suggestions.status is 'success | timeout | parse_failed | provider_error';
comment on column public.ai_grading_suggestions.prompt_version is 'Identificador semántico, ej. "grade.v1", "grade.v2"';

alter table public.gradings
  add constraint gradings_ai_suggestion_id_fkey
  foreign key (ai_suggestion_id) references public.ai_grading_suggestions(id);
