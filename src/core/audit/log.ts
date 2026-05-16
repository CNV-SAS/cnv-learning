// Audit logging centralizado (SECURITY.md 115-130).
//
// Toda escritura a public.audit_logs pasa por aqui. Usa el cliente admin
// (service role, bypass RLS) porque audit_logs no tiene INSERT policy
// para authenticated (intencional, SECURITY.md 685): solo el sistema
// escribe audit, los usuarios no.
//
// IMPORTANTE: audit failure NO debe romper el flujo principal. Si la
// BD falla momentaneamente, logueamos el error y seguimos. Un login que
// funciona pero no audito es preferible a un login que falla por audit.
// La perdida ocasional de audit la asumimos como tradeoff.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/core/logger/logger";
import type { Json } from "@/types/database.generated";

export type AuditEventInput = {
  actorId: string | null;
  actorEmail: string | null;
  event: string;
  resourceType?: string;
  resourceId?: string;
  // Json (tipo generado) en vez de Record<string, unknown>: el campo BD
  // es jsonb, requiere values JSON-safe. Caller debe pasar solo primitivos
  // o composiciones de ellos (sin Date, Map, undefined inline, etc.).
  metadata?: { [key: string]: Json };
  ipAddress?: string;
  userAgent?: string;
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    actor_email: input.actorEmail,
    event: input.event,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    logger.error("Audit log insert failed", {
      event: input.event,
      actorId: input.actorId,
      message: error.message,
    });
  }
}
