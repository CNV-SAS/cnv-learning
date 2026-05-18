// Repositorio de audit_logs (ARCHITECTURE.md regla dura 8: ningun
// evento de negocio critico sin audit trail).
//
// USA SERVICE ROLE explicitamente porque la tabla audit_logs solo
// permite INSERT desde service role (RLS solo deja SELECT a admins,
// SIN INSERT/UPDATE/DELETE para usuarios normales). Esto preserva
// inmutabilidad del audit: ningun caller puede manipular sus propios
// logs. La justificacion del bypass esta en admin.ts.
//
// Convencion (ARCHITECTURE.md regla 8): "audit en la misma transaccion
// cuando es posible". Aqui NO es transaccional (service client
// separado del flow); por eso si el audit insert falla tras un
// grading exitoso, no hacemos throw (log error a Sentry, prefer
// "audit perdido" sobre "feature rota"). El monitoring detecta gaps.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/core/logger/logger";
import type { Database } from "@/types/database.generated";

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

export interface AuditRecordInput {
  event: string;
  resourceType?: string | null;
  resourceId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  // El caller pasa cualquier objeto serializable; el cast a Json
  // ocurre en el insert (linea 36). Mantener Record aqui evita
  // forzar al caller a importar el type Json de Supabase.
  metadata?: Record<string, unknown> | null;
}

export const auditRepository = {
  async record(input: AuditRecordInput): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_logs").insert({
      event: input.event,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      metadata: (input.metadata ?? null) as AuditLogInsert["metadata"],
    });

    if (error) {
      logger.error("Audit log failed", {
        event: input.event,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        actorId: input.actorId,
        supabaseError: error.message,
      });
      // NO throw: prefer audit perdido sobre feature rota.
    }
  },
};
