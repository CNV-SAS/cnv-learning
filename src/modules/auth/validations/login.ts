// Schema de validacion para login (email + password + next opcional).
// SECURITY.md 151+: toda entrada externa pasa por Zod sin excepciones.

import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email invalido"),

  password: z.string().min(1, "La contrasena es requerida"),

  // next opcional para redirect post-login (lo setea el middleware como
  // ?next=<pathname>). Restricciones anti open-redirect:
  // - Debe empezar con "/" (ruta interna, no URL absoluta).
  // - NO debe empezar con "//" (protocol-relative URL como
  //   "//evil.com/x" que el browser resolveria a https://evil.com/x).
  next: z
    .string()
    .startsWith("/", "La ruta debe ser interna y empezar con /")
    .refine((v) => !v.startsWith("//"), {
      message: "Ruta invalida (no se permite protocol-relative)",
    })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
