-- Migration: 0003_courses_and_teachers
-- Why: courses es el contenedor academico (curso/diplomado/programa). slug
-- unique permite URLs estables tipo /courses/medicina-bioelectrica.
-- is_published controla visibilidad (drafts no se muestran a estudiantes).
-- course_teachers es la relacion N:N que permite que un curso tenga varios
-- docentes y un docente este asignado a varios cursos (preparando v2, aunque
-- en MVP es 1:1). El PK compuesto previene duplicados y el on delete cascade
-- limpia automaticamente si se elimina el curso o el docente.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_url text,
  is_published boolean not null default false,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_slug_idx on public.courses(slug);
create index courses_published_idx on public.courses(is_published);

create table public.course_teachers (
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);

create index course_teachers_teacher_idx on public.course_teachers(teacher_id);
