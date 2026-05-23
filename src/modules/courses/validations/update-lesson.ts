import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

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

function nullableUrl() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    })
    .pipe(
      z
        .string()
        .url("URL inválida")
        .max(2048, "La URL no puede superar 2048 caracteres")
        .nullable(),
    );
}

export const updateLessonSchema = z
  .object({
    lessonId: z.string().regex(UUID_FORMAT, "ID de lección inválido"),
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(200, "El título no puede superar 200 caracteres"),
    type: z.enum(["video", "pdf", "mixed"]),
    contentMarkdown: nullableTrimmedText(20000, "El contenido"),
    videoUrl: nullableUrl(),
    durationMinutes: z
      .number()
      .int()
      .min(1, "La duración debe ser >= 1 minuto")
      .max(999, "La duración no puede superar 999 minutos")
      .nullable()
      .optional()
      .transform((v) => (v == null ? null : v)),
  })
  .superRefine((data, ctx) => {
    if (data.type === "video" && !data.videoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El video URL es obligatorio para lecciones de tipo video.",
        path: ["videoUrl"],
      });
    }
  });

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
