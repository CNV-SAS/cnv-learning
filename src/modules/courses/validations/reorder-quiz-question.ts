// Validacion del input para reorderQuizQuestionAction (Bloque 23.2.b).
// direction = "up" | "down" sigue el patron del reorderModuleSchema
// (0027), que es mas seguro que dejar al cliente computar el target
// position (UI no necesita conocer las positions actuales).

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const reorderQuizQuestionSchema = z.object({
  questionId: z.string().regex(UUID_FORMAT, "ID de pregunta inválido"),
  direction: z.enum(["up", "down"]),
});

export type ReorderQuizQuestionInput = z.infer<
  typeof reorderQuizQuestionSchema
>;
