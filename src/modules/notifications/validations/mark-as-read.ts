// Validacion del input para markAsReadAction. Solo necesita el
// notificationId; el user_id se resuelve de la sesion en el action.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const markAsReadSchema = z.object({
  notificationId: z.string().regex(UUID_FORMAT, "ID de notificación inválido"),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
