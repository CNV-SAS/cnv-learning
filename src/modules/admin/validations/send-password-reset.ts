// Validacion del input para sendPasswordResetAction. El admin
// fuerza el envio de un link de recovery al email del target.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const sendPasswordResetSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
});

export type SendPasswordResetInput = z.infer<typeof sendPasswordResetSchema>;
