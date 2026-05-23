-- Migration: 0030_course_resources
-- Why: Bloque 20.1. Tabla unificada course_resources para recursos
-- descargables del curso (PDFs, DOCX, slides, audios) y links externos
-- (Zoom recordings, Drive). Discriminado por `kind`:
--   file: storage_path + size_bytes + mime_type requeridos.
--   link: external_url requerido.
-- module_id nullable: NULL = recurso general del curso; set = recurso
-- de un modulo especifico.
--
-- Bucket course-resources separado de lesson-materials (que sigue
-- siendo para lesson_attachments, no se toca aqui).
--
-- Path convention: `{courseId}/{general|modules/moduleId}/{uuid}.{ext}`
-- El primer segmento es el courseId; las RLS de storage usan
-- (storage.foldername(name))[1]::uuid para verificar que el caller sea
-- teacher asignado a ese curso, con regex pre-check para evitar que
-- un path malformado (ej. "not-uuid/foo.pdf") cause un cast error que
-- abortee el statement.

create type public.resource_kind as enum ('file', 'link');

create table public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  kind public.resource_kind not null,
  title text not null,
  description text,
  storage_path text,
  external_url text,
  size_bytes bigint,
  mime_type text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index course_resources_course_idx on public.course_resources(course_id);
create index course_resources_module_idx on public.course_resources(module_id);

create trigger set_updated_at_course_resources
  before update on public.course_resources
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS para la tabla course_resources
-- ============================================================
alter table public.course_resources enable row level security;

create policy "Enrolled students view course resources" on public.course_resources
  for select using (public.is_enrolled(course_id));

create policy "Teachers view course resources of their courses" on public.course_resources
  for select using (public.is_course_teacher(course_id));

create policy "Teachers manage course resources of their courses" on public.course_resources
  for all using (public.is_course_teacher(course_id))
  with check (public.is_course_teacher(course_id));

create policy "Admins manage course resources" on public.course_resources
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- Storage bucket course-resources + RLS
-- ============================================================
insert into storage.buckets (id, name, public) values ('course-resources', 'course-resources', false);

-- SELECT: cualquiera (enrolled student, teacher de curso, admin) que
-- pueda ver la row en course_resources puede leer el blob. La join
-- contra course_resources con storage_path = name centraliza la
-- verificacion de permisos via las policies de la tabla.
create policy "Read course-resources" on storage.objects
  for select using (
    bucket_id = 'course-resources'
    and exists(
      select 1 from public.course_resources cr
      where cr.storage_path = name and (
        public.is_enrolled(cr.course_id)
        or public.is_course_teacher(cr.course_id)
        or public.current_user_role() = 'admin'
      )
    )
  );

-- INSERT: teachers solo a su curso, admins a cualquiera. La regex
-- pre-check evita cast errors de UUID malformado en el path.
create policy "Teachers upload to course-resources" on storage.objects
  for insert with check (
    bucket_id = 'course-resources'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_course_teacher(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins upload to course-resources" on storage.objects
  for insert with check (
    bucket_id = 'course-resources'
    and public.current_user_role() = 'admin'
  );

create policy "Teachers delete course-resources" on storage.objects
  for delete using (
    bucket_id = 'course-resources'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_course_teacher(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins delete from course-resources" on storage.objects
  for delete using (
    bucket_id = 'course-resources'
    and public.current_user_role() = 'admin'
  );
