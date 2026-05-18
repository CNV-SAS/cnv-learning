// Policy: el usuario puede ver esta submission.
//
// Thin wrapper sobre RLS: students ven own submissions, teachers de
// sus cursos, admins todo. Si submissionRepository.findById retorna
// != null, RLS aprobo. admin bypass explicito.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface SubmissionViewContext {
  submissionExists: boolean;
}

export function canViewSubmission(
  user: AuthenticatedUser,
  context: SubmissionViewContext,
): boolean {
  if (user.role === "admin") return true;
  return context.submissionExists;
}
