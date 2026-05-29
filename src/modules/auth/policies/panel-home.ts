// Helper: resuelve la URL del "panel" del rol del usuario. Usado por
// los breadcrumbs del editor de contenidos del curso, donde el primer
// nivel apunta a /admin o /teacher segun quien navega.
//
// Smoke E2E post-ISSUE-3: el admin recibia 404 al pulsar "Panel
// docente" porque el link estaba hardcodeado a /teacher. Tanto teacher
// como admin acceden al editor (canEditCourseContent admite admin),
// asi que el breadcrumb tiene que adaptarse.

import type { AuthenticatedUser } from "@/modules/auth/types";

export function panelHomeFor(user: AuthenticatedUser): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "teacher") return "/teacher";
  return "/dashboard";
}

export function panelLabelFor(user: AuthenticatedUser): string {
  if (user.role === "admin") return "Panel admin";
  if (user.role === "teacher") return "Panel docente";
  return "Inicio";
}
