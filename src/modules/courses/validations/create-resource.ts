// Validacion para createCourseResourceAction (Bloque 20.2).
// Discriminado por `kind`: file requiere storagePath + sizeBytes +
// mimeType; link requiere externalUrl. Validacion cruzada via
// superRefine. La validacion estricta de MIME y quota se hace en el
// service (requiere fetch del total actual del curso).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";
import { COURSE_RESOURCE_FILE_MAX_BYTES } from "@/modules/courses/data/course-resource-constants";

function nullableTrimmedText(maxLength: number, label: string) {
  return z
    .string()
    .max(maxLength, `${label} no puede superar ${maxLength} caracteres`)
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    });
}

export const createCourseResourceSchema = z
  .object({
    courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
    moduleId: z
      .string()
      .regex(UUID_FORMAT, "ID de módulo inválido")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    kind: z.enum(["file", "link"]),
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(200, "El título no puede superar 200 caracteres"),
    description: nullableTrimmedText(1000, "La descripción"),
    // file fields
    storagePath: z
      .string()
      .max(500, "El path supera 500 caracteres")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    sizeBytes: z
      .number()
      .int()
      .min(1, "El tamaño debe ser > 0")
      .max(
        COURSE_RESOURCE_FILE_MAX_BYTES,
        "El archivo supera el máximo de 20 MB",
      )
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    mimeType: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    // link fields
    externalUrl: z
      .string()
      .max(2048, "La URL supera 2048 caracteres")
      .nullable()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
      .pipe(z.string().url("URL inválida").nullable()),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "file") {
      if (!data.storagePath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["storagePath"],
          message: "storagePath es obligatorio para archivos.",
        });
      }
      if (data.sizeBytes === null || data.sizeBytes === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sizeBytes"],
          message: "sizeBytes es obligatorio para archivos.",
        });
      }
      if (!data.mimeType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mimeType"],
          message: "mimeType es obligatorio para archivos.",
        });
      }
    } else if (data.kind === "link") {
      if (!data.externalUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalUrl"],
          message: "El URL externo es obligatorio para links.",
        });
      }
    }
  });

export type CreateCourseResourceInput = z.infer<
  typeof createCourseResourceSchema
>;
