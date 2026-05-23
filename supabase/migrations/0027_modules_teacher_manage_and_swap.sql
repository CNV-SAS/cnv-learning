-- Migration: 0027_modules_teacher_manage_and_swap
-- Why: Bloque 19.2 introduce CRUD de modulos para docentes. La RLS
-- pre-Bloque 19 solo permite a admin manage modules (migracion 0017,
-- policy "Admins manage modules"). Para que el teacher asignado pueda
-- crear/editar/borrar modulos de SU curso, agregamos un policy
-- "Teachers manage modules of their courses" que usa el helper
-- is_course_teacher(course_id) de la migracion 0014. La policy
-- canEditCourseContent (app layer) ya replica esta logica, RLS aqui
-- es defense-in-depth en el SQL boundary.
--
-- Adicionalmente: RPC swap_module_positions para reordenar dos
-- modulos de un curso de forma atomica. El problema: modules tiene
-- unique (course_id, position) que se chequea statement-end. Hacer
-- UPDATE A.position = B.position falla porque B aun lo tiene. Usamos
-- el sentinel -1 (modules.position es int sin CHECK >= 1, asi que
-- -1 es valido transitoriamente) en una funcion plpgsql que corre
-- en una sola transaccion. SECURITY INVOKER preserva RLS del caller.

create policy "Teachers manage modules of their courses" on public.modules
  for all using (public.is_course_teacher(course_id))
  with check (public.is_course_teacher(course_id));

create or replace function public.swap_module_positions(
  p_course_id uuid,
  p_pos_a int,
  p_pos_b int
)
returns void
language plpgsql
security invoker
as $$
begin
  if p_pos_a = p_pos_b then
    return;
  end if;

  update public.modules
    set position = -1
    where course_id = p_course_id and position = p_pos_a;

  update public.modules
    set position = p_pos_a
    where course_id = p_course_id and position = p_pos_b;

  update public.modules
    set position = p_pos_b
    where course_id = p_course_id and position = -1;
end;
$$;
