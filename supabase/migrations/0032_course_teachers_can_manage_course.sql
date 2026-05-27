-- Migration: 0032_course_teachers_can_manage_course
-- Why: Bloque 23.1. Introduce el flag can_manage_course por
-- (teacher_id, course_id) para que algunos teachers puedan editar
-- los metadatos del curso (titulo, slug, descripcion, cover,
-- is_published) ademas del contenido (modulos/lecciones/tareas/
-- recursos), que YA podian gestionar via is_course_teacher.
--
-- Modelo aditivo (decision D1 = B del plan B23):
--   - Sin flag: teacher asignado puede gestionar contenido (status
--     quo, RLS de modules/lessons/assignments/resources con
--     is_course_teacher).
--   - Con flag: agrega UPDATE en public.courses (editar metadata).
--
-- El flag NO permite:
--   - INSERT en courses (crear cursos = solo admin, decision D3).
--   - DELETE en courses (borrar = solo admin, decision D2).
--   - Asignar/desasignar otros teachers al mismo curso (decision D2).
-- Esos siguen exclusivamente bajo "Admins manage courses" (RLS 0017).
--
-- Helper SQL can_manage_course(uuid) sigue el mismo patron que
-- is_course_teacher (0014): stable + security definer + search_path
-- = '' + identificadores calificados (hardening DATABASE.md). Lo
-- usa la policy nueva sobre courses y se reutiliza desde la app
-- layer via repos para chequeos en TS.

-- ============================================================
-- 1) Columna nueva en course_teachers
-- ============================================================
alter table public.course_teachers
  add column can_manage_course boolean not null default false;

comment on column public.course_teachers.can_manage_course is
  'Flag aditivo per-curso: si true, el teacher puede editar metadatos del curso ademas del contenido. NO concede INSERT/DELETE de courses ni gestion de otros teachers.';

-- ============================================================
-- 2) Helper SQL can_manage_course(course_id)
-- ============================================================
create or replace function public.can_manage_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.course_teachers
    where teacher_id = auth.uid()
      and course_id = p_course_id
      and can_manage_course = true
  )
$$;

comment on function public.can_manage_course(uuid) is
  'Returns true si el caller es teacher asignado a p_course_id con can_manage_course=true. Mismo patron que is_course_teacher; hardened con search_path empty.';

-- ============================================================
-- 3) Policy "Teachers manage course meta with flag"
-- ============================================================
-- Solo UPDATE. INSERT/DELETE quedan bajo "Admins manage courses"
-- (migracion 0017). El SELECT no se agrega porque ya esta cubierto
-- por "Teachers view their assigned courses" (0017).
create policy "Teachers manage course meta with flag" on public.courses
  for update to authenticated
  using (public.can_manage_course(id))
  with check (public.can_manage_course(id));
