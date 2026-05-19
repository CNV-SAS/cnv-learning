// Validacion del input para createThreadAction. Limites alineados
// con SECURITY.md 161-162 (title 3-200, body 10-10000). El body
// se renderiza como markdown sanitizado en UI; el limite max evita
// abuso de storage y de rendering cost.

import { z } from "zod";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const createThreadSchema = z.object({
  forumId: z.string().regex(UUID_FORMAT, "ID de foro inválido"),
  title: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  body: z
    .string()
    .trim()
    .min(10, "El cuerpo debe tener al menos 10 caracteres")
    .max(10000, "El cuerpo no puede superar 10000 caracteres"),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
