// Validacion del input para createUserAction. El admin entra
// email + full_name + role. La password no se entra: el admin
// envia un magic link que el usuario abre y configura su password
// la primera vez (decision plan B14).
//
// fullName.regex(\p{L}/u): rechaza nombres que sean solo digitos o
// solo simbolos (smoke S1.2). \p{L} matchea cualquier letra Unicode
// (Spanish, German, French, etc.), no solo ASCII. Posicion libre:
// basta con que el string contenga al menos una letra.

import { z } from "zod";

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido"),
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    // 22.15: max 40 chars para que el nombre quepa en el PDF del
    // Profesional Conectado CNV (cap visual del template).
    .max(
      40,
      "El nombre es demasiado largo para el certificado. Máximo 40 caracteres.",
    )
    .regex(/\p{L}/u, "El nombre debe contener al menos una letra"),
  role: z.enum(["student", "teacher", "admin"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
