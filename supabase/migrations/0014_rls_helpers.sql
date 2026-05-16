-- Migration: 0014_rls_helpers
-- Why: helpers para autorizar consultas via RLS (DATABASE.md lineas 487-525)
-- y storage policies (0015). Se aplican aqui, antes de cualquier policy que
-- los referencie, para resolver dependencias forward.
--
-- Las 3 funciones son security definer y stable (cacheable dentro de la
-- query). Hardening obligatorio para security definer (convencion acordada
-- en sub-bloque 1.2): set search_path = '' + identificadores calificados
-- con schema, previene search_path hijacking.
--
-- auth.uid() es funcion built-in de Supabase del schema auth; se llama
-- explicitamente calificada porque search_path vacio no la encontraria
-- por busqueda implicita.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = p_course_id and is_active = true
  )
$$;

create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.course_teachers
    where teacher_id = auth.uid() and course_id = p_course_id
  )
$$;
