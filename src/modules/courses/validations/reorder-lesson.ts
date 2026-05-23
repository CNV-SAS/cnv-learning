import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const reorderLessonSchema = z.object({
  lessonId: z.string().regex(UUID_FORMAT, "ID de lección inválido"),
  direction: z.enum(["up", "down"]),
});

export type ReorderLessonInput = z.infer<typeof reorderLessonSchema>;
