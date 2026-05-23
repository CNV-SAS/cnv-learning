-- Migration: 0028_lessons_teacher_manage_and_swap
-- Why: Bloque 19.3 introduce CRUD de lecciones para docentes. La RLS
-- pre-Bloque 19 solo permite a admin manage lessons (migracion 0017,
-- "Admins manage lessons"). Para que el teacher asignado pueda
-- crear/editar/borrar lecciones de SU curso, agregamos un policy
-- "Teachers manage lessons of their courses" que walka el join
-- lessons -> modules -> course_teachers via is_course_teacher().
--
-- RPC swap_lesson_positions: mismo patron del swap_module_positions
-- (migracion 0027) pero scoped por module_id en lugar de course_id.
-- Sentinel -1 transitorio para sortear el unique (module_id, position).

create policy "Teachers manage lessons of their courses" on public.lessons
  for all using (
    exists(
      select 1 from public.modules m
      where m.id = lessons.module_id and public.is_course_teacher(m.course_id)
    )
  ) with check (
    exists(
      select 1 from public.modules m
      where m.id = lessons.module_id and public.is_course_teacher(m.course_id)
    )
  );

create or replace function public.swap_lesson_positions(
  p_module_id uuid,
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

  update public.lessons
    set position = -1
    where module_id = p_module_id and position = p_pos_a;

  update public.lessons
    set position = p_pos_a
    where module_id = p_module_id and position = p_pos_b;

  update public.lessons
    set position = p_pos_b
    where module_id = p_module_id and position = -1;
end;
$$;
