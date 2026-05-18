// Policy: el usuario puede ver esta grading.
//
// Thin wrapper sobre RLS: students ven gradings de own submissions,
// teachers de sus cursos, admins todo. Si gradingRepository.findById
// retorna != null, RLS aprobo; admin bypass implicito.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface GradingViewContext {
  gradingExists: boolean;
}

export function canViewGrading(
  user: AuthenticatedUser,
  context: GradingViewContext,
): boolean {
  if (user.role === "admin") return true;
  return context.gradingExists;
}
