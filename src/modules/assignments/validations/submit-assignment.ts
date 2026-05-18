// Validation schemas para submitAssignmentAction. El input llega
// via FormData (el action lo extrae); este schema valida los
// campos string. El archivo (cuando type='file_upload') se valida
// en el service contra MAX_FILE_SIZE_BYTES + ALLOWED_MIME_TYPES.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

// Comun: assignmentId UUID.
export const submitFileSchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
});

export const submitEssaySchema = z.object({
  assignmentId: z.string().regex(UUID_FORMAT, "ID de tarea inválido"),
  essayText: z
    .string()
    .min(1, "El texto de la entrega no puede estar vacío"),
});

export type SubmitFileInput = z.infer<typeof submitFileSchema>;
export type SubmitEssayInput = z.infer<typeof submitEssaySchema>;
