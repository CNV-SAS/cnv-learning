// Repositorio de academic_certificates (Bloque 22.2). Read-only
// para students (RLS user_id = auth.uid()); admin tiene CRUD via
// admin client.
//
// El blob PDF vive en el bucket academic-certificates. Storage
// operations las maneja el service usando admin client.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { logger } from "@/core/logger/logger";
import type { Database } from "@/types/database.generated";
import type { AcademicCertificate } from "../types";

type AcademicCertificateInsert =
  Database["public"]["Tables"]["academic_certificates"]["Insert"];

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const BUCKET = "academic-certificates";

export const academicCertificateRepository = {
  async findById(id: string): Promise<AcademicCertificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("academic_certificates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Devuelve el cert academico del student para un curso (si existe).
  // Usado por la vista student /certificates y por admin para chequear
  // duplicados antes de upload.
  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<AcademicCertificate | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("academic_certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Lista todos los certs academicos del student (multi-curso futuro).
  async listForUser(userId: string): Promise<AcademicCertificate[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("academic_certificates")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async create(
    input: AcademicCertificateInsert,
  ): Promise<AcademicCertificate> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("academic_certificates")
      .insert(input)
      .select("*")
      .single();
    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create academic certificate",
      );
    }
    return data;
  },

  // Hard delete (academic certs no tienen revocacion logica; si hay
  // un error en el PDF subido, se borra y se vuelve a subir).
  async delete(id: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("academic_certificates")
      .delete()
      .eq("id", id);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Signed URL para descarga. TTL 15 min, mismo patron que
  // lesson_attachments + course_resources.
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data) {
      logger.warn("getSignedUrl: academic certificate blob not found", {
        storagePath,
        bucket: BUCKET,
        supabaseError: error?.message,
      });
      return null;
    }
    return data.signedUrl;
  },

  // Upload del PDF al bucket via admin client.
  async uploadBlob(
    storagePath: string,
    file: File,
  ): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
    if (error) {
      throw new InfrastructureError(ErrorCodes.STORAGE_ERROR, error.message);
    }
  },

  async deleteBlob(storagePath: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (error) {
      logger.warn("deleteBlob: failed to remove academic certificate blob", {
        storagePath,
        bucket: BUCKET,
        supabaseError: error.message,
      });
      // NO throw: orfan blob queda para cleanup B22.6.
    }
  },
};
