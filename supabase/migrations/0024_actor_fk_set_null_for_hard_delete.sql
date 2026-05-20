-- Migration: 0024_actor_fk_set_null_for_hard_delete
-- Why: para soportar hard delete de usuarios via auth.admin.deleteUser
-- en el Bloque 14 (gestion admin), los FKs que apuntan a profiles.id
-- como "actor" (quien hizo algo) deben migrar de NO ACTION a SET NULL.
-- Esto preserva la historia (audit logs, anuncios emitidos, gradings,
-- etc.) aunque el usuario que la genero ya no exista (consideracion
-- B del plan B14 + decision general "hard delete con preservacion de
-- rastro forense").
--
-- audit_logs.actor_id: ya nullable, solo cambia FK rule.
-- certificates.revoked_by: ya nullable, solo cambia FK rule.
-- enrollments.enrolled_by: ya nullable, solo cambia FK rule.
-- ai_grading_suggestions.generated_by: NOT NULL -> nullable + FK rule.
-- announcements.author_id: NOT NULL -> nullable + FK rule.
-- gradings.graded_by: NOT NULL -> nullable + FK rule.
--
-- UI consumer de estos campos debe tolerar null y mostrar "(usuario
-- eliminado)" o similar. Defensa de codigo en los componentes que
-- renderizan "Por: X" / "Calificado por X" / etc.

-- audit_logs.actor_id
alter table public.audit_logs
  drop constraint audit_logs_actor_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
  foreign key (actor_id) references public.profiles(id)
  on delete set null;

-- certificates.revoked_by
alter table public.certificates
  drop constraint certificates_revoked_by_fkey;
alter table public.certificates
  add constraint certificates_revoked_by_fkey
  foreign key (revoked_by) references public.profiles(id)
  on delete set null;

-- enrollments.enrolled_by
alter table public.enrollments
  drop constraint enrollments_enrolled_by_fkey;
alter table public.enrollments
  add constraint enrollments_enrolled_by_fkey
  foreign key (enrolled_by) references public.profiles(id)
  on delete set null;

-- ai_grading_suggestions.generated_by
alter table public.ai_grading_suggestions
  alter column generated_by drop not null;
alter table public.ai_grading_suggestions
  drop constraint ai_grading_suggestions_generated_by_fkey;
alter table public.ai_grading_suggestions
  add constraint ai_grading_suggestions_generated_by_fkey
  foreign key (generated_by) references public.profiles(id)
  on delete set null;

-- announcements.author_id
alter table public.announcements
  alter column author_id drop not null;
alter table public.announcements
  drop constraint announcements_author_id_fkey;
alter table public.announcements
  add constraint announcements_author_id_fkey
  foreign key (author_id) references public.profiles(id)
  on delete set null;

-- gradings.graded_by
alter table public.gradings
  alter column graded_by drop not null;
alter table public.gradings
  drop constraint gradings_graded_by_fkey;
alter table public.gradings
  add constraint gradings_graded_by_fkey
  foreign key (graded_by) references public.profiles(id)
  on delete set null;
