-- Migration: 0006_enrollments_progress
-- Why: enrollments registra la inscripcion de un estudiante a un curso.
-- enrolled_by guarda quien inscribio (admin en MVP, manual), util para
-- auditoria. is_active permite suspender un enrollment sin perder el
-- historial (alternativa a hard delete). unique (user_id, course_id)
-- previene doble enrollment al mismo curso.
--
-- lesson_progress registra que el estudiante marco completada una leccion.
-- completed_at se setea una vez y no cambia (sin updated_at). unique
-- (user_id, lesson_id) garantiza idempotencia: marcar dos veces es no-op.

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references public.profiles(id),
  is_active boolean not null default true,
  unique (user_id, course_id)
);

create index enrollments_user_idx on public.enrollments(user_id);
create index enrollments_course_idx on public.enrollments(course_id);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress(user_id);
create index lesson_progress_lesson_idx on public.lesson_progress(lesson_id);
