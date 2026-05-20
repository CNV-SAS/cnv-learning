// Validacion del input para createEnrollmentAction. El admin elige
// (userId, courseId) desde /admin/users/[id]/enrollments.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const createEnrollmentSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  courseId: z.string().regex(UUID_FORMAT, "ID de curso inválido"),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
