// Policy: el usuario puede editar este thread.
//
// Reglas:
//   - autor del thread: SI.
//   - admin: SI (backup de moderacion en MVP; el panel admin de
//     v2 lo formaliza con audit log).
//   - cualquier otro: NO.
//
// La RLS policy "Authors update own threads" (DATABASE.md 1000)
// hace el chequeo real en BD; esta policy filtra antes para que
// el UI no muestre el boton de edit a usuarios sin permiso.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface ThreadEditContext {
  threadExists: boolean;
  authorId: string;
}

export function canEditThread(
  user: AuthenticatedUser,
  context: ThreadEditContext,
): boolean {
  if (!context.threadExists) return false;
  if (user.role === "admin") return true;
  return context.authorId === user.id;
}
