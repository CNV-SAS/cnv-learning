// Policy: strict teacher-only para /teacher/* (bandeja + grader).
//
// Distinta de canAccessTeacherPanel (que permite admin como
// soporte). Razon: RLS de submissions filtra por is_course_teacher,
// asi que un admin entrando aqui ve bandeja vacia siempre (UX
// confusa). El admin tendra su panel propio en Bloque 14 con vista
// completa cross-curso via service_role o policies admin
// especificas.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessTeacherInbox(user: AuthenticatedUser): boolean {
  return user.role === "teacher";
}
