-- Migration: 0036_certificate_kind_and_updates
-- Why: introduce el concepto de "Constancia de Actualizacion" para
-- estudiantes que vuelven al 100% de un curso despues de que se le
-- agrego contenido nuevo. La constancia original (kind='completion')
-- se preserva; las posteriores se emiten como kind='update'.
--
-- Decision Q5 (analisis): 1 completion valida + N updates ilimitados
-- por (user, course). Si la completion anterior fue revocada
-- (status='revoked'), se permite emitir una nueva completion
-- (decision Q6).
--
-- Mecanismo: partial unique index WHERE kind='completion' AND
-- status='valid'. Esto garantiza:
--   - 1 sola completion valida maximo por (user, course).
--   - Pueden coexistir N completions revoked + 1 completion valid.
--   - Updates sin restriccion de unicidad.
--
-- Default 'completion' es retrocompatible: los certificados ya
-- emitidos antes de esta migracion quedan tipados como completion
-- (que es lo que historicamente representaban).
--
-- Nota sobre hash: el hash existente NO se recalcula. Los certificados
-- previos preservan su hash original (computado con user_id +
-- course_id + issued_at + template_version sin kind). Los nuevos
-- certificados emitidos POST-migracion incluiran kind en el hash
-- (decision Q7, implementacion en certificateService).

-- ============================================================
-- 1) Enum certificate_kind
-- ============================================================
create type public.certificate_kind as enum ('completion', 'update');

-- ============================================================
-- 2) Columna kind en certificates
-- ============================================================
alter table public.certificates
  add column kind public.certificate_kind not null default 'completion';

comment on column public.certificates.kind is
  'completion = primera constancia emitida al cruzar 100%. update = constancia emitida cuando el student vuelve al 100% tras agregarse contenido nuevo al curso.';

-- ============================================================
-- 3) Reemplazar unique constraint
-- ============================================================
-- El constraint actual unique (user_id, course_id) bloquea cualquier
-- segunda emision para el par. Hay que removerlo y reemplazarlo por
-- un partial index que permita coexistencia de updates + revoked
-- completions con una unica completion valida.
alter table public.certificates
  drop constraint certificates_user_id_course_id_key;

-- Partial unique: solo aplica a kind='completion' AND status='valid'.
-- Esto permite:
--   - 1 sola completion valid por (user, course).
--   - N completions revoked (historico) + 1 completion valid simultaneas.
--   - N updates por (user, course) sin restriccion.
create unique index certificates_one_valid_completion_per_user_course
  on public.certificates (user_id, course_id)
  where kind = 'completion' and status = 'valid';

comment on index public.certificates_one_valid_completion_per_user_course is
  'Garantiza una sola Constancia de Finalizacion valida por (user, course). Permite revocar y re-emitir; permite ilimitadas constancias de actualizacion en paralelo.';
