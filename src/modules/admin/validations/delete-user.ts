// Validacion del input para deleteUserAction. El admin pasa
// userId + confirmEmail (tipea el email del target para evitar
// clicks accidentales). El service valida que confirmEmail
// coincida con el email del profile target.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteUserSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  confirmEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email de confirmación inválido"),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
