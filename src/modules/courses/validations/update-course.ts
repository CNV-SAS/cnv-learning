// Validacion del input para updateCourseAction (Bloque 23.1).
//
// Editar metadata es admin OR teacher asignado con can_manage_course
// = true (decision D1 plan B23). Schema acepta los 5 campos:
// titulo, slug, descripcion, coverUrl, isPublished. La verificacion
// de unicidad del slug (excluyendo el courseId actual) y la policy
// se hace en courseMetaService.updateCourse.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import { COURSE_SLUG_FORMAT } from "./create-course";

export const updateCourseSchema = z.object({
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
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
  isPublished: z.boolean(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
