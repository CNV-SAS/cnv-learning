import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

// Smoke E2E post-ISSUE-3: admin puede forzar el delete cuando hay
// entregas o calificaciones registradas. El service valida que el
// role sea admin antes de honrar forceDelete.
export const deleteAssignmentSchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
  forceDelete: z.boolean().default(false),
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;
