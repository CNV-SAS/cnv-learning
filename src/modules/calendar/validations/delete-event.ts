// Validacion del input para deleteEventAction. Bloque 15.
// Hard delete sin confirmation typeo: un evento de calendario no
// es destructivo del progreso del alumno (a diferencia de delete
// user); el admin/teacher recrea facilmente si fue accidente.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const deleteEventSchema = z.object({
  eventId: z.string().regex(UUID_FORMAT, "ID de evento inválido"),
});

export type DeleteEventInput = z.infer<typeof deleteEventSchema>;
