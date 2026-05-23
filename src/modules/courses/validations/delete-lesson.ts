import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteLessonSchema = z.object({
  lessonId: z.string().regex(UUID_FORMAT, "ID de lección inválido"),
});

export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>;
