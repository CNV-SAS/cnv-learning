// Schema de validacion para forgot-password (solo email).
// SECURITY.md 151+: toda entrada externa pasa por Zod sin excepciones.

import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Email invalido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
