// Validacion del input para deleteAcademicCertificateAction
// (Bloque 22.3). Solo necesita el id del cert academico; el service
// valida policy + existencia.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteAcademicCertificateSchema = z.object({
  id: z.string().regex(UUID_FORMAT, "ID de certificado inválido"),
});

export type DeleteAcademicCertificateInput = z.infer<
  typeof deleteAcademicCertificateSchema
>;
