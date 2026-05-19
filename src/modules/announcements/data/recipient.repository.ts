// Repositorio de resolucion de recipients para announcements.
//
// USA SERVICE ROLE (admin client) explicitamente porque:
//   1. La enumeracion completa de recipients es una operacion
//      privilegiada de "sistema", no del user emisor. La policy
//      del service (canEmitCourseAnnouncement / canEmitGlobalAnno-
//      uncement) ya verifico la autoridad del caller.
//   2. Mantiene predictabilidad: la misma resolucion funciona para
//      cualquier rol emisor sin depender del set de policies RLS
//      del caller (que podria cambiar y romper sutilmente la
//      enumeracion de recipients).
//   3. Excluir el author del set de recipients (no notificarse
//      a si mismo de su propia accion) requiere conocer ambos
//      sides; con admin client es trivial filtrar en SQL.
//
// Justificacion alineada con SECURITY.md (lib/supabase/admin.ts
// header lista "Tareas administrativas masivas iniciadas por admin"
// como caso legitimo; enumerar recipients de un anuncio cae aqui).

import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { AnnouncementRecipient } from "../types";

export const recipientRepository = {
  // Recipients de un anuncio de scope='course': students con
  // enrollment activo en el curso, excluyendo al author (el teacher
  // emisor no se notifica a si mismo).
  async listCourseRecipients(
    courseId: string,
    excludeUserId: string,
  ): Promise<AnnouncementRecipient[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("user_id, profile:profiles!enrollments_user_id_fkey(id, email, full_name)")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .neq("user_id", excludeUserId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    // Cast: select shape devuelve profile como objeto plain via
    // embedded join; filtramos rows donde profile sea null por seguridad.
    return (data ?? [])
      .map((row) => row.profile)
      .filter((p): p is { id: string; email: string; full_name: string } => p !== null)
      .map((p) => ({
        userId: p.id,
        email: p.email,
        fullName: p.full_name,
      }));
  },

  // Recipients de un anuncio scope='global': todos los profiles
  // (todos los roles authenticated) excepto el author.
  async listGlobalRecipients(
    excludeUserId: string,
  ): Promise<AnnouncementRecipient[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .neq("id", excludeUserId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []).map((p) => ({
      userId: p.id,
      email: p.email,
      fullName: p.full_name,
    }));
  },
};
