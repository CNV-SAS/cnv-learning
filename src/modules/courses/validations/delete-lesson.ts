import { z } from "zod";

export const deleteLessonSchema = z.object({
  lessonId: z.string().uuid(),
});

export type DeleteLessonInput = z.infer<typeof deleteLessonSchema>;
