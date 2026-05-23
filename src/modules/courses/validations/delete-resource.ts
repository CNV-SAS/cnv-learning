import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteCourseResourceSchema = z.object({
  resourceId: z.string().regex(UUID_FORMAT, "ID de recurso inválido"),
});

export type DeleteCourseResourceInput = z.infer<
  typeof deleteCourseResourceSchema
>;
