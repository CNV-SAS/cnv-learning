// Validaciones para asignar/remover docentes a/de cursos en
// course_teachers (Bloque 14.11, fix BUG 2). Mismo shape para
// ambas: par (teacherUserId, courseId).
//
// Bloque 23.1.c agrega updateTeacherCoursePermissionsSchema para
// flip del flag can_manage_course en una asignacion existente.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const assignTeacherToCourseSchema = z.object({
  teacherUserId: z.string().regex(UUID_FORMAT, "ID de docente inválido"),
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
});

export const removeTeacherFromCourseSchema = assignTeacherToCourseSchema;

export const updateTeacherCoursePermissionsSchema = z.object({
  teacherUserId: z.string().regex(UUID_FORMAT, "ID de docente inválido"),
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
  canManageCourse: z.boolean(),
});

export type AssignTeacherToCourseInput = z.infer<
  typeof assignTeacherToCourseSchema
>;
export type RemoveTeacherFromCourseInput = z.infer<
  typeof removeTeacherFromCourseSchema
>;
export type UpdateTeacherCoursePermissionsInput = z.infer<
  typeof updateTeacherCoursePermissionsSchema
>;
