-- Migration: 0012_certificates
-- Why: certificates es la entidad institucional verificable (no solo un PDF
-- generado on-the-fly). hash es SHA-256 de (user_id, course_id, issued_at,
-- template_version) calculado por el route handler de emision (Bloque 12),
-- guardado aqui para verificacion publica posterior. template_version queda
-- congelado para que al regenerar el PDF se use el template historico, no
-- el actual (compliance + estetica reproducible). revoked_* son nullables
-- y solo se llenan al revocar; status separa el flujo logico del de hash.
--
-- Sin updated_at: el certificado se emite, eventualmente se revoca (3
-- columnas mutan: revoked_at, revoked_by, status). Modelar como
-- destructivo simple sobre esas columnas es suficiente y mas claro que
-- un audit_log inferido por updated_at. La auditoria real va en audit_logs
-- (Bloque 14).
--
-- Unique (user_id, course_id) garantiza un solo certificado por par;
-- emitir uno nuevo requiere primero revocar el anterior.

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revoked_reason text,
  hash text not null,
  template_version text not null default 'v1',
  status public.certificate_status not null default 'valid',
  unique (user_id, course_id)
);

create index certificates_user_idx on public.certificates(user_id);
create index certificates_status_idx on public.certificates(status);

comment on column public.certificates.template_version is 'Identifica el template histórico. Al regenerar el PDF, se usa esta versión, no la actual.';
comment on column public.certificates.hash is 'SHA-256(user_id || course_id || issued_at || template_version)';
