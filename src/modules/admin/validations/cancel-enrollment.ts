// Validacion del input para cancelEnrollmentAction. El admin elige
// el enrollmentId desde la lista de cursos del usuario.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const cancelEnrollmentSchema = z.object({
  enrollmentId: z.string().regex(UUID_FORMAT, "ID de inscripción inválido"),
});

export type CancelEnrollmentInput = z.infer<typeof cancelEnrollmentSchema>;
