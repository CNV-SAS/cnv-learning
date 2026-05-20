// Policy: el usuario puede acceder al panel docente (/teacher).
//
// STRICT teacher: solo role === "teacher". Antes (Bloque 2) admitia
// tambien admin "para soporte / QA / demostraciones", pero el smoke
// del Bloque 13 detecto que el admin via /teacher veia todos los
// cursos mezclados sin distinguir teacher (listAllAccessible).
// Refactor del Bloque 14.1: admin entra via /admin/teachers para
// elegir un docente especifico y desde alli abrir la misma vista
// del overview con teacherId explicito en la URL.
//
// /teacher/announce y /teacher/students/[userId] usan checks
// inline (teacher OR admin) en sus pages porque admin SI tiene
// flujo para emitir anuncios y ver detalle de alumno; solo /teacher
// (overview) y /teacher/inbox (canAccessTeacherInbox tambien
// strict) son teacher-only.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function canAccessTeacherPanel(user: AuthenticatedUser): boolean {
  return user.role === "teacher";
}
