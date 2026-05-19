// Validacion del input para revokeCertificateAction. Razon obligatoria
// minimo 3 chars para que el revoke tenga trazabilidad util en la
// pagina /verify cuando un viewer pregunta por que se revoco.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const revokeCertificateSchema = z.object({
  certificateId: z
    .string()
    .regex(UUID_FORMAT, "ID de certificado inválido"),
  reason: z
    .string()
    .trim()
    .min(3, "La razón debe tener al menos 3 caracteres")
    .max(500, "La razón no puede superar 500 caracteres"),
});

export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;
