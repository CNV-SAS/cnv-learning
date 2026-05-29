import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

// Smoke E2E post-ISSUE-3: admin puede forzar el delete cuando hay
// dependencias (lecciones, tareas, entregas, calificaciones). El
// service valida que el role sea admin antes de honrar forceDelete.
export const deleteModuleSchema = z.object({
  moduleId: z.string().regex(UUID_FORMAT, "ID de módulo inválido"),
  forceDelete: z.boolean().default(false),
});

export type DeleteModuleInput = z.infer<typeof deleteModuleSchema>;
