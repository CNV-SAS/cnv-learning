// Repositorio de notifications (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md 1082-1094):
//   - SELECT: user_id = auth.uid() (o admin ve todas).
//   - UPDATE: user_id = auth.uid() (para marcar como leida).
//   - INSERT: solo service role (sin policy para users).
//   - DELETE: ninguna policy, nadie borra.
//
// listForUser y countUnreadForUser usan server client (RLS aplica).
// markAsRead y markAllAsRead usan server client (RLS valida ownership
// en el UPDATE). createBulk usa admin client porque INSERT esta
// bloqueado por RLS para users normales: las notifications las crea
// el sistema (grading service, announcement service, etc.), no el
// usuario directo.
//
// createBulk hace UN solo INSERT con VALUES multi-row para eficiencia:
// para 10 alumnos cobra 1 roundtrip en lugar de 10 (consideracion B
// del plan del Bloque 10). Supabase JS client lo serializa asi cuando
// se le pasa un array al .insert().

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import type {
  Notification,
  NotificationKind,
  NotificationInsert,
} from "../types";

export interface CreateBulkInput {
  userIds: string[];
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const notificationRepository = {
  async listForUser(userId: string): Promise<Notification[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Counter para el bell del header. RLS filtra a las notifications
  // del user; el indice parcial notifications_unread_idx (DATABASE.md
  // 422) hace el count O(log n).
  async countUnreadForUser(userId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  // Marca una notification como leida. RLS valida user_id = auth.uid()
  // en el UPDATE; aqui no agregamos filtro defensivo. Si la
  // notification no es del user, el UPDATE no afecta filas (no error).
  async markAsRead(notificationId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Marca todas las no leidas del user como leidas. RLS hace el
  // filtrado por auth.uid(); el .eq("user_id", userId) es defensa
  // explicita para que no haya doubt sobre el scope.
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Insert bulk via service role. RLS bloquea INSERT para users
  // normales (DATABASE.md: "notifications sin INSERT por user, solo
  // sistema"). Los callers (grading.service, announcement.service)
  // disparan creacion en nombre del sistema, no del usuario receptor.
  //
  // Un solo statement INSERT con VALUES multi-row (Supabase serializa
  // asi cuando se le pasa array al .insert()). Atomico: o todas las
  // notifications se insertan o ninguna.
  async createBulk(input: CreateBulkInput): Promise<void> {
    if (input.userIds.length === 0) return;

    const supabase = createAdminClient();
    const rows: NotificationInsert[] = input.userIds.map((userId) => ({
      user_id: userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: (input.metadata ?? null) as NotificationInsert["metadata"],
    }));

    const { error } = await supabase.from("notifications").insert(rows);

    if (error) {
      logger.error("Bulk notification insert failed", {
        kind: input.kind,
        recipientCount: input.userIds.length,
        supabaseError: error.message,
      });
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
