-- Migration: 0004_modules_lessons
-- Why: modules es la unidad academica dentro de un curso (10 modulos por
-- curso en MVP), lessons es la unidad de contenido dentro de un modulo
-- (video, pdf, mixed). position permite orden explicito y unique compuesto
-- (parent_id, position) previene colisiones. weight numeric en modules se
-- usa para promedio ponderado de la nota final del curso (Bloque 5+).
-- duration_minutes es nullable porque algunas lecciones son solo texto.

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null,
  weight numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create index modules_course_idx on public.modules(course_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  type public.lesson_type not null,
  content_markdown text,
  video_url text,
  position int not null,
  duration_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create index lessons_module_idx on public.lessons(module_id);
