// Validacion del input para updateProfileAction (Bloque 16).
//
// 6 campos editables (decision A del plan):
//   - full_name: required, 3-200 chars.
//   - bio: nullable, max 1000 chars (texto plano, sin markdown).
//   - professional_license: nullable, max 100.
//   - institution: nullable, max 200.
//   - specialization: nullable, max 200.
// avatar_url se actualiza via updateAvatarAction separada
// (componente cliente sube primero a Storage, luego confirma URL).
//
// Strings vacios se transforman a undefined para que el service
// los persista como null en la BD (consistente con el resto del
// MVP donde "" no es un valor distinto a null en columnas
// opcionales).

import { z } from "zod";

function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} no puede superar ${maxLength} caracteres`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));
}

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede superar 200 caracteres"),
  bio: optionalText(1000, "La biografía"),
  professionalLicense: optionalText(100, "El número de licencia"),
  institution: optionalText(200, "La institución"),
  specialization: optionalText(200, "La especialización"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
