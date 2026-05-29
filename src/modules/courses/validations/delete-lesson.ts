import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

// Smoke E2E post-ISSUE-3: admin puede forzar el delete cuando hay
// progreso de alumnos registrado. El service valida que el role sea
// admin antes de honrar forceDelete.
export const deleteLessonSchema = z.object({
  lessonId: z.string().regex(UUID_FORMAT, "ID de lección inválido"),
  forceDelete: z.boolean().default(false),
});

export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>;
