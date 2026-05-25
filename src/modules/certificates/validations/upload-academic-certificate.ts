// Validacion del input para uploadAcademicCertificateAction
// (Bloque 22.3). El File se valida en el service (MIME application/pdf
// + max 20 MB); este schema solo cubre los campos metadata que llegan
// como strings via FormData.
//
// notes acepta null (textarea vacia desde la UI). Cap 500 chars para
// que no se infle el row si admin pega texto largo accidentalmente.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const uploadAcademicCertificateSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no pueden superar 500 caracteres")
    .nullable(),
});

export type UploadAcademicCertificateInput = z.infer<
  typeof uploadAcademicCertificateSchema
>;
