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
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import type { Database } from "@/types/database.generated";

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

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

export interface ListAuditLogsParams {
  page: number; // 1-based
  perPage: number;
  // Filtros opcionales para la UI /admin/audit. event = match exacto
  // (lo selecciona el admin de un dropdown). actorEmail = ILIKE
  // contains para busqueda libre por texto.
  event?: string;
  actorEmail?: string;
}

export interface ListAuditLogsResult {
  rows: AuditLog[];
  total: number;
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

  // Lista paginada para /admin/audit. count exact + range para
  // pagina N. order by created_at desc usa el indice
  // audit_logs_created_idx. Filtros opcionales por event (exact)
  // y actorEmail (ILIKE contains).
  async listPaginated(
    params: ListAuditLogsParams,
  ): Promise<ListAuditLogsResult> {
    const supabase = createAdminClient();
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.event) {
      query = query.eq("event", params.event);
    }
    if (params.actorEmail) {
      query = query.ilike("actor_email", `%${params.actorEmail}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return { rows: data ?? [], total: count ?? 0 };
  },

  // Lista distinct de eventos registrados, util para el filtro
  // dropdown del panel /admin/audit. Para MVP el set es manejable
  // (< 30 tipos de eventos); para v2 con miles de tipos se evalua
  // tabla catalogo separada.
  async listDistinctEvents(): Promise<string[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("event")
      .order("event", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.event) seen.add(row.event);
    }
    return Array.from(seen).sort();
  },
};
