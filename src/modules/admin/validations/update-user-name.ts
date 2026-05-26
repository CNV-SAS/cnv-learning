// Validacion del input para updateUserNameAction (Bloque 22.15).
//
// Admin edita el nombre completo de un user. Mismo criterio que
// createUserSchema (S1.2) y el ex-updateProfileSchema: al menos
// una letra Unicode para evitar nombres solo-digitos.
//
// Max 40 chars: cap fisico del PDF del Profesional Conectado CNV
// (Bloque 22.15 ajuste). "Santiago Del Carmen Restrepo Arroyaves"
// = 38 chars y es el limite practico que cabe sin overflow visual
// en el template. createUserSchema tambien aplica este max para
// evitar crear users que luego no podrian recibir el certificado.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const updateUserNameSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(
      40,
      "El nombre es demasiado largo para el certificado. Máximo 40 caracteres.",
    )
    .regex(/\p{L}/u, "El nombre debe contener al menos una letra"),
});

export type UpdateUserNameInput = z.infer<typeof updateUserNameSchema>;
