// Schema de validacion para reset-password (password + confirmPassword).
// SECURITY.md 151+: toda entrada externa pasa por Zod sin excepciones.
//
// Password policy aplicada (decision 4 del Bloque 2 aprobada por
// Santiago el 2026-05-16): minimo 8 caracteres + al menos 1 letra +
// al menos 1 digito. SIN simbolos especiales obligatorios (B2C de
// profesionales de salud, no se quiere fricar la UX de reset).

import { z } from "zod";

const passwordPolicySchema = z
  .string()
  .min(8, "Minimo 8 caracteres")
  .regex(/[a-zA-Z]/, "Debe contener al menos una letra")
  .regex(/\d/, "Debe contener al menos un digito");

export const resetPasswordSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
