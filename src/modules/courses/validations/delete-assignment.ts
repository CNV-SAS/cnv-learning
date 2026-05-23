import { z } from "zod";

export const deleteAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;
