// Validacion del input para updateUserRoleAction. El admin pasa
// userId del target + nuevo rol. Los anti-self / anti-lockout los
// hace la policy en el service, no aqui.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const updateRoleSchema = z.object({
  userId: z.string().regex(UUID_FORMAT, "ID de usuario inválido"),
  role: z.enum(["student", "teacher", "admin"]),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
