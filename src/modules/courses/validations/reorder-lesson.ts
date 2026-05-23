import { z } from "zod";

export const reorderLessonSchema = z.object({
  lessonId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export type ReorderLessonInput = z.infer<typeof reorderLessonSchema>;
