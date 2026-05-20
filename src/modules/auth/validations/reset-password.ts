// Schema de validacion para reset-password (password + confirmPassword).
// SECURITY.md 151+: toda entrada externa pasa por Zod sin excepciones.
//
// Politica de password compartida en passwordPolicySchema (single
// source of truth en password-policy.ts; usada tambien por
// changePasswordSchema del Bloque 16).

import { z } from "zod";
import { passwordPolicySchema } from "./password-policy";

export const resetPasswordSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
