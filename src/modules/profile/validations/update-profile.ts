// Validacion del input para updateProfileAction (Bloque 16).
//
// 4 campos editables por el user (decision 22.15: full_name solo
// admin):
//   - bio: nullable, max 1000 chars (texto plano, sin markdown).
//   - professional_license: nullable, max 100.
//   - institution: nullable, max 200.
//   - specialization: nullable, max 200.
//
// full_name se removio del schema en 22.15 porque permitir al user
// cambiar su nombre tras emitir un certificado corporativo era
// vector de fraude (el PDF del Profesional Conectado CNV se
// renderiza on-demand con full_name actual; el hash se calcula con
// user_id + timestamp + template_version, sin incluir el nombre,
// asi que cambiarlo post-emision no rompe el hash pero si cambia
// lo que ve el verificador). Ahora solo admin puede modificarlo
// via updateUserNameAction (admin user service).
//
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
  bio: optionalText(1000, "La biografía"),
  professionalLicense: optionalText(100, "El número de licencia"),
  institution: optionalText(200, "La institución"),
  specialization: optionalText(200, "La especialización"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
