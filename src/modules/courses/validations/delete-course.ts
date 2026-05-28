// Validacion del input para deleteCourseAction (Bloque 23 smoke #2).
//
// confirmTitle es el titulo exacto del curso que el admin escribe en
// el dialog para confirmar el borrado destructivo (CASCADE arrastra
// modulos, lecciones, tareas, submissions, calificaciones,
// enrollments, foros, anuncios y certificados emitidos al curso).
//
// La verificacion confirmTitle === course.title se hace en el service
// con trim, no en Zod (Zod no conoce el target).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteCourseSchema = z.object({
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
  confirmTitle: z
    .string()
    .trim()
    .min(1, "Escribe el título del curso para confirmar"),
});

export type DeleteCourseInput = z.infer<typeof deleteCourseSchema>;
