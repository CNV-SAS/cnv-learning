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
import type { Certificate } from "../types";

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
