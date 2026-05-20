// Validacion del input para changePasswordAction.
//
// Diferencia con resetPasswordSchema (Bloque 2): aqui pedimos
// current_password porque el user opera con sesion normal
// (no sesion temporal de recovery). Consideracion A1 del plan B16.
//
// passwordPolicySchema compartido con resetPasswordSchema
// (mismo minimo 8 + 1 letra + 1 digito). Si la politica cambia,
// actualizar password-policy.ts.

import { z } from "zod";
import { passwordPolicySchema } from "@/modules/auth/validations/password-policy";

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Ingresa tu contraseña actual"),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser diferente a la actual",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
