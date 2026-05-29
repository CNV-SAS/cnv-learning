-- Migration: 0038_grading_status_trigger
-- Why: ISSUE 3 fix BUG CRÍTICO 1. El campo submissions.status nunca
-- transicionaba de 'submitted' a 'graded' en el codigo de la app (ni
-- quiz.service ni grading.service hacian el UPDATE). Pre-ISSUE-3 el
-- bug estaba enmascarado porque el progreso aceptaba 'submitted' como
-- "hecho". Post-refactor, listPassedRequiredAssignmentIdsForUserAnd-
-- Course filtra estricto por status='graded' y excluye todo el
-- progreso del student.
--
-- Fix: trigger AFTER INSERT ON gradings que transiciona el status del
-- submission referenciado. Atomicidad garantizada al nivel SQL (sin
-- race conditions de Supabase JS sin transacciones).
--
-- SECURITY DEFINER + search_path = '' (convencion del proyecto, igual
-- que las otras funciones security definer): el teacher que llama
-- gradingRepository.create no tiene UPDATE policy en submissions
-- (solo "Students update own draft submissions" existe en RLS). Sin
-- SECURITY DEFINER el trigger fallaria silenciosamente para los
-- gradings creados por docentes via el cliente normal. Con definer +
-- search_path vacio, la funcion ejecuta como owner pero solo puede
-- referenciar objetos por nombre completo (public.submissions), lo
-- que previene path-injection si alguien crea schemas conflictivos.
--
-- Backfill: las submissions historicas del cohorte de prueba que ya
-- tienen grading necesitan el status corregido para que el progreso
-- se recalcule correctamente. UPDATE puntual al final de la migracion.

create or replace function public.set_submission_status_graded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submissions
  set status = 'graded'
  where id = new.submission_id
    and status <> 'graded';
  return new;
end;
$$;

create trigger set_submission_status_graded
  after insert on public.gradings
  for each row execute function public.set_submission_status_graded();

-- Backfill: corrige las submissions historicas que ya tienen grading
-- pero quedaron en status='submitted' por el bug. Idempotente (where
-- status <> 'graded' evita updates innecesarios).
update public.submissions s
set status = 'graded'
where status <> 'graded'
  and exists (
    select 1 from public.gradings g where g.submission_id = s.id
  );
