// Validacion del input para suspendUserAction / unsuspendUserAction.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const suspendUserSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  reason: z
    .string()
    .trim()
    .min(3, "El motivo debe tener al menos 3 caracteres")
    .max(500, "El motivo no puede superar 500 caracteres"),
});

export const unsuspendUserSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type UnsuspendUserInput = z.infer<typeof unsuspendUserSchema>;
