// Repositorio de certificates (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md 1098-1107):
//   - SELECT: student propio (user_id=auth.uid()) o admin manage.
//   - INSERT: solo admin manage (no users normales).
//   - UPDATE: solo admin manage.
//   - DELETE: no policy, no se borran (revoke es soft).
//
// Pares server-client / admin-client por endpoint:
//   - findById: server client + RLS (student own, admin all).
//   - findByIdPublic: admin client (para /verify sin auth).
//   - findByUserAndCourse: admin client (para issueCertificate
//     check antes de insert; no expone certs ajenos).
//   - create: admin client (RLS bloquea INSERT por user; la
//     emision es operacion de sistema cuando student llega a 100%).
//   - revoke: admin client (RLS deja admin manage; el caller ya
//     paso canRevokeCertificate policy).
//   - listAll: server client + RLS (admin ve todos; student ve
//     propios; teacher solo propios si los tuviera, pero no
//     aplica para teacher en MVP).
//   - listForUser: server client (student ve sus propios).

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type {
  Certificate,
  CertificateForVerify,
  CertificateWithDetails,
} from "../types";

type CertificateInsert =
  Database["public"]["Tables"]["certificates"]["Insert"];

export interface RevokeCertificateInput {
  id: string;
  revokedBy: string;
  reason: string;
}

export const certificateRepository = {
  async findById(id: string): Promise<Certificate | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Para /verify/[id] (publica sin auth). Sin auth.uid() la RLS no
  // dejaria pasar la SELECT; admin client bypassa porque la pagina
  // es publica por diseño (SECURITY.md lib/supabase/admin.ts caso 2).
  async findByIdPublic(id: string): Promise<Certificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Para /verify/[id]: cert + studentName + courseTitle en una sola
  // query via PostgREST embed. Sin email u otros campos sensibles del
  // estudiante (la pagina es publica). Admin client justificado
  // mismo que findByIdPublic (sin auth, RLS bypassa).
  async findByIdForVerify(
    id: string,
  ): Promise<CertificateForVerify | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select(
        "id, user_id, course_id, issued_at, revoked_at, revoked_reason, hash, template_version, status, kind, student:profiles!certificates_user_id_fkey(full_name), course:courses!certificates_course_id_fkey(title)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    if (!data) return null;

    type Joined = typeof data & {
      student: { full_name: string } | null;
      course: { title: string } | null;
    };
    const row = data as Joined;
    if (!row.student || !row.course) {
      // El cascade delete del FK garantiza que si el cert existe,
      // student y course existen. Si llegamos aqui es bug; logueamos
      // implicitamente devolviendo null para que la pagina muestre
      // "no encontrado" en vez de crashear.
      return null;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      course_id: row.course_id,
      issued_at: row.issued_at,
      revoked_at: row.revoked_at,
      revoked_reason: row.revoked_reason,
      hash: row.hash,
      template_version: row.template_version,
      status: row.status,
      kind: row.kind,
      studentName: row.student.full_name,
      courseTitle: row.course.title,
    };
  },

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Certificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Bloque post-23 (constancias de actualizacion). Lookup de la
  // completion VALIDA por (user, course). Usado por
  // certificateService.issueCertificate para decidir kind:
  //   - null -> emite completion (primera vez O completion previa
  //     fue revocada y se re-emite, decision Q6).
  //   - existe -> emite update (vuelve al 100% tras contenido nuevo).
  // Ignora revoked completions y todos los updates (que tambien
  // pueden tener status valid sin afectar la decision).
  async findValidCompletionByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Certificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("kind", "completion")
      .eq("status", "valid")
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async listForUser(userId: string): Promise<Certificate[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Bloque 22.14: head count de Constancias de Finalizacion validas
  // del user. Alimenta el calculo de las insignias Explorador CNV
  // (>= 5) y Maestro CNV (>= 10) en badgesService.
  async countValidByUser(userId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "valid");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  // Para la tabla de /admin/certificates: cert + student + course
  // embedded. Admin client justificado: la pagina es admin-only y el
  // embed via server client tendria que respaldarse en RLS de
  // profiles + courses (que admin tiene, pero el admin client da
  // predictabilidad sin depender de configurar todas las cadenas).
  async listAllWithDetails(): Promise<CertificateWithDetails[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .select(
        "*, student:profiles!certificates_user_id_fkey(full_name, email), course:courses!certificates_course_id_fkey(title)",
      )
      .order("issued_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }

    type JoinedRow = Certificate & {
      student: { full_name: string; email: string } | null;
      course: { title: string } | null;
    };
    const rows = (data ?? []) as unknown as JoinedRow[];
    const result: CertificateWithDetails[] = [];
    for (const row of rows) {
      if (!row.student || !row.course) continue;
      result.push({
        ...row,
        studentName: row.student.full_name,
        studentEmail: row.student.email,
        courseTitle: row.course.title,
      });
    }
    return result;
  },

  // Lista todos los certificados accesibles para el caller. Admin
  // via RLS "Admins manage" ve todos; student via "Students view own"
  // solo los suyos. Para /admin/certificates en MVP es la fuente.
  async listAll(): Promise<Certificate[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .order("issued_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async create(
    input: Pick<
      CertificateInsert,
      | "user_id"
      | "course_id"
      | "issued_at"
      | "hash"
      | "template_version"
      // Bloque post-23: kind se setea por el service (default DB es
      // 'completion' pero hacerlo explicito evita ambiguedad).
      | "kind"
    >,
  ): Promise<Certificate> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .insert(input)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create certificate",
      );
    }
    return data;
  },

  async revoke(input: RevokeCertificateInput): Promise<Certificate> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("certificates")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: input.revokedBy,
        revoked_reason: input.reason,
      })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to revoke certificate",
      );
    }
    return data;
  },
};
