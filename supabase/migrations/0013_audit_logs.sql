-- Migration: 0013_audit_logs
-- Why: audit_logs registra eventos criticos (login admin, cambios de rol,
-- eliminaciones, calificaciones, emisiones de certificado) segun la regla
-- dura 8 de ARCHITECTURE.md y la lista de SECURITY.md lineas 134-145.
-- actor_email se duplica con profiles.email para que el log sobreviva si
-- el actor es borrado. resource_type + resource_id como par texto
-- permite registrar eventos sobre cualquier entidad sin FK ad-hoc por tabla.
-- ip_address inet captura forense de origen. metadata jsonb para payload
-- libre por evento.
--
-- 4 indices secundarios optimizan los patrones de consulta esperados:
-- por actor (auditoria de un user), por event (analitica de tipos),
-- por resource (historial de una entidad), por created_at desc (ultimos
-- N eventos para el panel admin de SECURITY.md linea 149).
--
-- Inmutable por diseno (sin updated_at). Las policies (admin-only read,
-- inserts via service role) se aplican en migracion 0020.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_email text,
  event text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_event_idx on public.audit_logs(event);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
