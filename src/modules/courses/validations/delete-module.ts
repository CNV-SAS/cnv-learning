import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteModuleSchema = z.object({
  moduleId: z.string().regex(UUID_FORMAT, "ID de módulo inválido"),
});

export type DeleteModuleInput = z.infer<typeof deleteModuleSchema>;
