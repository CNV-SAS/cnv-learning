// Validacion del input para revokeCorporateCertificateAction
// (Bloque 22.3). Mismo patron que revokeCertificateSchema: razon
// obligatoria min 3 chars para que el revoke tenga trazabilidad
// util en la pagina publica /verify-corporate/[id] cuando un
// viewer pregunta por que se revoco.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const revokeCorporateCertificateSchema = z.object({
  id: z.string().regex(UUID_FORMAT, "ID de certificado inválido"),
  reason: z
    .string()
    .trim()
    .min(3, "La razón debe tener al menos 3 caracteres")
    .max(500, "La razón no puede superar 500 caracteres"),
});

export type RevokeCorporateCertificateInput = z.infer<
  typeof revokeCorporateCertificateSchema
>;
