// Validacion del input para createCourseAction (Bloque 23.1).
//
// Crear curso es admin-only (decision D3 plan B23). is_published
// no entra en el schema: el curso recien creado siempre arranca
// con is_published=false. Habilitarlo es decision posterior via
// updateCourseAction.
//
// Slug: lowercase + alfanumerico + guiones, 3-60 chars. Patron
// estandar para URLs (mismo del schema SQL en migracion 0003).
// Sin guiones consecutivos ni inicio/fin con guion (regex evita
// formatos como "--foo" o "foo-" o "-foo").

import { z } from "zod";

export const COURSE_SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(60, "El slug no puede superar 60 caracteres")
    .regex(
      COURSE_SLUG_FORMAT,
      "El slug solo admite minúsculas, números y guiones (sin guiones al inicio, fin o consecutivos).",
    ),
  description: z
    .string()
    .max(2000, "La descripción no puede superar 2000 caracteres")
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
  coverUrl: z
    .string()
    .url("La URL de la portada es inválida")
    .max(500, "La URL no puede superar 500 caracteres")
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
