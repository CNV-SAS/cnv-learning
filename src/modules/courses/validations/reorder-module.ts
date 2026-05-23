import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const reorderModuleSchema = z.object({
  moduleId: z.string().regex(UUID_FORMAT, "ID de módulo inválido"),
  direction: z.enum(["up", "down"]),
});

export type ReorderModuleInput = z.infer<typeof reorderModuleSchema>;
