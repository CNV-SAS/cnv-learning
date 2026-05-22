-- Migration: 0026_cleanup_non_student_lesson_progress
-- Why: pre-S1.3 los admin y teacher podian marcar lecciones como
-- completadas porque markLessonCompletedAction solo validaba via
-- canViewLesson (que permite admin/teacher) y no por rol. Eso
-- generaba rows en lesson_progress de usuarios que NO son students,
-- ensuciando metricas y haciendo aparecer a admin/teacher como
-- "alumnos" en el panel del docente (la lista de alumnos se deriva
-- de lesson_progress + enrollments).
--
-- A partir del fix S1.3 la action usa canCompleteLesson que rechaza
-- role != student. Esta migracion limpia los rows historicos
-- generados durante el bug. Idempotente: si no hay rows que matchean
-- la condicion, el delete simplemente afecta 0 rows.

delete from public.lesson_progress
where user_id in (
  select id from public.profiles where role <> 'student'
);
