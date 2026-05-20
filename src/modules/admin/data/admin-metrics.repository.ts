// Repositorio de metricas del panel admin (Bloque 14.8).
//
// USA SERVICE ROLE (admin client) porque:
//   1. Los counts deben ser deterministas independientes del RLS
//      del caller (admin RLS suele ver todo, pero predictibilidad
//      total).
//   2. La pagina /admin ya filtra acceso a admin via canAccessAdmin
//      en el layout.
//
// Solo lectura, sin business logic, sin audit. La pagina /admin
// la consume directamente (no service): no hay policy/audit/side-
// effect que justifique una capa extra.

import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

export interface UserCountsByRole {
  student: number;
  teacher: number;
  admin: number;
  total: number;
}

export interface CertificateCounts {
  valid: number;
  revoked: number;
  total: number;
}

export const adminMetricsRepository = {
  async countUsersByRole(): Promise<UserCountsByRole> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    const counts: UserCountsByRole = {
      student: 0,
      teacher: 0,
      admin: 0,
      total: 0,
    };
    for (const row of data ?? []) {
      counts.total += 1;
      if (row.role === "student") counts.student += 1;
      else if (row.role === "teacher") counts.teacher += 1;
      else if (row.role === "admin") counts.admin += 1;
    }
    return counts;
  },

  async countCertificates(): Promise<CertificateCounts> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("status");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    const counts: CertificateCounts = { valid: 0, revoked: 0, total: 0 };
    for (const row of data ?? []) {
      counts.total += 1;
      if (row.status === "valid") counts.valid += 1;
      else if (row.status === "revoked") counts.revoked += 1;
    }
    return counts;
  },

  // Submissions pendientes = status='submitted' (entregadas y aun
  // sin calificar). Las 'graded'/'returned' ya pasaron por el
  // docente; las 'draft' no se cuentan porque no requieren accion.
  async countPendingSubmissions(): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  // Threads totales del foro. Sin filtro de "activos" porque el
  // schema de threads no tiene is_closed/archived en MVP (solo
  // is_pinned). Count total da una metrica de actividad acumulada.
  async countForumThreads(): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("forum_threads")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },
};
