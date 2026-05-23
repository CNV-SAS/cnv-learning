-- Migration: 0029_assignments_teacher_manage
-- Why: Bloque 19.4 introduce CRUD de assignments para docentes. La
-- RLS pre-Bloque 19 (migracion 0018) tiene "Admins manage
-- assignments" pero no permite a teacher manage. Agregamos
-- "Teachers manage assignments of their courses" que walka
-- assignments -> modules -> course_teachers via is_course_teacher().
--
-- NO se agrega RPC swap aqui: assignments no tiene columna position
-- (decision D2 del planning Bloque 19) y el reorder no aplica.

create policy "Teachers manage assignments of their courses" on public.assignments
  for all using (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_course_teacher(m.course_id)
    )
  ) with check (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_course_teacher(m.course_id)
    )
  );
