// Validacion del input para issueCorporateCertificateAction
// (Bloque 22.3). El service valida que el target sea student y que
// no exista ya un cert vigente.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const issueCorporateCertificateSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
});

export type IssueCorporateCertificateInput = z.infer<
  typeof issueCorporateCertificateSchema
>;
