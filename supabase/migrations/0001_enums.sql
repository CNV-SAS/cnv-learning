-- Migration: 0001_enums
-- Why: Enums centrales del dominio (DATABASE.md principio 8). Se declaran antes
-- de cualquier tabla porque profiles.role, lessons.type, assignments.type,
-- submissions.status, notifications.kind y certificates.status los referencian.
-- Cambiar un enum requiere una migracion posterior con alter type, no editar
-- este archivo (DATABASE.md principio 3, forward-only).

create type user_role as enum ('student', 'teacher', 'admin');

create type lesson_type as enum ('video', 'pdf', 'mixed');

create type assignment_type as enum ('file_upload', 'quiz_multiple_choice', 'essay');

create type submission_status as enum ('draft', 'submitted', 'graded', 'returned');

create type notification_kind as enum (
  'graded',
  'announcement_course',
  'announcement_global',
  'certificate_issued',
  'certificate_revoked',
  'submission_received'
);

create type certificate_status as enum ('valid', 'revoked');
