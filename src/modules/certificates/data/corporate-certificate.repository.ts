// Repositorio de corporate_certificates (Bloque 22.2). Read-only
// para students (RLS user_id = auth.uid()); admin tiene CRUD via
// admin client. Mismo patron que el certificate.repository (Bloque
// 12) de la Constancia de Finalizacion.
//
// findForVerify usa admin client porque /verify-corporate/[id] es
// pagina publica (sin auth) y necesita read garantizado del row +
// nombre del student.

import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type {
  CorporateCertificate,
  CorporateCertificateForVerify,
} from "../types";

type CorporateCertificateInsert =
  Database["public"]["Tables"]["corporate_certificates"]["Insert"];

export const corporateCertificateRepository = {
  async findById(id: string): Promise<CorporateCertificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Devuelve el cert corporativo del student (uno solo per
  // unique(user_id) si se quisiera enforzar; en MVP se permite
  // multiple historicos pero por convencion 1 vigente).
  async findValidByUser(
    userId: string,
  ): Promise<CorporateCertificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "valid")
      .maybeSingle();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async listForUser(userId: string): Promise<CorporateCertificate[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .select("*")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async create(
    input: CorporateCertificateInsert,
  ): Promise<CorporateCertificate> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .insert(input)
      .select("*")
      .single();
    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create corporate certificate",
      );
    }
    return data;
  },

  // Marca como revocado. status pasa a 'revoked', revoked_at y
  // revoked_by se setean. revoked_reason opcional.
  async revoke(
    id: string,
    revokedBy: string,
    revokedReason: string | null,
  ): Promise<CorporateCertificate> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoked_reason: revokedReason,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to revoke corporate certificate",
      );
    }
    return data;
  },

  // Para la pagina publica /verify-corporate/[id]. Admin client
  // porque no hay user autenticado. Embed profiles para el nombre.
  async findForVerify(
    id: string,
  ): Promise<CorporateCertificateForVerify | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("corporate_certificates")
      .select("*, profiles!corporate_certificates_user_id_fkey(full_name)")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    if (!data) return null;
    // El embed retorna profiles como objeto; lo extraemos.
    const profile = data.profiles as { full_name: string } | null;
    return {
      id: data.id,
      user_id: data.user_id,
      issued_at: data.issued_at,
      revoked_at: data.revoked_at,
      revoked_reason: data.revoked_reason,
      hash: data.hash,
      template_version: data.template_version,
      status: data.status,
      studentName: profile?.full_name ?? "Estudiante",
    };
  },
};
