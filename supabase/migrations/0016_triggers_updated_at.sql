-- Migration: 0016_triggers_updated_at
-- Why: mantener updated_at consistente en las 7 tablas que lo declaran
-- (DATABASE.md principio 5). Centralizar en un solo trigger reusable es
-- mejor que repetir UPDATE statements en cada server action.
--
-- set_updated_at no es security definer porque solo muta el row que el
-- caller ya esta updateando con sus propios permisos. No requiere
-- privilegios elevados, asi que la convencion de set search_path = ''
-- (acordada en 1.2 para security definer) no aplica aqui.
--
-- Tablas con updated_at (verificado contra DATABASE.md):
-- profiles, courses, modules, lessons, assignments, submissions,
-- forum_threads. Otras tablas (enrollments, lesson_progress,
-- quiz_options, gradings, ai_grading_suggestions, forums,
-- forum_replies, announcements, notifications, certificates,
-- audit_logs, lesson_attachments, course_teachers, quiz_questions)
-- son inmutables o solo mutan campos especificos (read_at en
-- notifications), no necesitan updated_at automatico.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_courses
  before update on public.courses
  for each row execute function public.set_updated_at();

create trigger set_updated_at_modules
  before update on public.modules
  for each row execute function public.set_updated_at();

create trigger set_updated_at_lessons
  before update on public.lessons
  for each row execute function public.set_updated_at();

create trigger set_updated_at_assignments
  before update on public.assignments
  for each row execute function public.set_updated_at();

create trigger set_updated_at_submissions
  before update on public.submissions
  for each row execute function public.set_updated_at();

create trigger set_updated_at_forum_threads
  before update on public.forum_threads
  for each row execute function public.set_updated_at();
