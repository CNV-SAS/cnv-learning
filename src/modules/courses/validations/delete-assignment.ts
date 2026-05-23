import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteAssignmentSchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;
