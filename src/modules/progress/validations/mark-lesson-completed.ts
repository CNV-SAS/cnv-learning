// Validation schema para markLessonCompletedAction. Solo recibe el
// lessonId; el userId lo resuelve la action desde la sesion (NO se
// acepta de input).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const markLessonCompletedSchema = z.object({
  lessonId: z.string().regex(UUID_FORMAT, "ID de lección inválido"),
});

export type MarkLessonCompletedInput = z.infer<
  typeof markLessonCompletedSchema
>;
