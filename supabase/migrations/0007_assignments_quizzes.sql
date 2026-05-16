-- Migration: 0007_assignments_quizzes
-- Why: assignments es la entidad academica evaluable (file_upload, essay,
-- quiz_multiple_choice). due_at nullable permite tareas abiertas sin
-- plazo. max_score numeric default 100 unifica la escala. is_required
-- default true porque en MVP toda tarea pesa en el progreso (no opcionales).
--
-- quiz_questions y quiz_options solo aplican cuando type='quiz_multiple_choice'.
-- Se modelan como tablas separadas (no jsonb) para permitir RLS granular,
-- estadisticas por pregunta, y eventual editor por docente en v1.1. Las
-- opciones son inmutables por diseno (sin timestamps): regenerar opciones
-- implica borrar la pregunta entera.
--
-- Unique compuesto (parent_id, position) en ambas garantiza orden estable.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  type public.assignment_type not null,
  due_at timestamptz,
  max_score numeric not null default 100,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_module_idx on public.assignments(module_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  prompt text not null,
  position int not null,
  points numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  position int not null,
  unique (question_id, position)
);

create index quiz_options_question_idx on public.quiz_options(question_id);
