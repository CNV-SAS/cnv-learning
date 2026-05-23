import { z } from "zod";

export const reorderModuleSchema = z.object({
  moduleId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export type ReorderModuleInput = z.infer<typeof reorderModuleSchema>;
