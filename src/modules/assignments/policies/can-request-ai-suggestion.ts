// Policy: el usuario puede pedir una sugerencia IA sobre una
// submission. Mismo patron de canGradeAssignment: rol grader
// (teacher o admin) + submissionExists (RLS valida que el teacher
// tenga acceso al curso).
//
// Admin permitido como soporte/QA (caso paralelo al patron de
// canAccessTeacherPanel del Bloque 2; canAccessTeacherInbox del
// Bloque 6 es strict porque RLS lo dejaria vacio, aqui no aplica
// ese problema: admin puede generar sugerencias bajo demanda).

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface AiSuggestionContext {
  submissionExists: boolean;
}

export function canRequestAiSuggestion(
  user: AuthenticatedUser,
  context: AiSuggestionContext,
): boolean {
  if (user.role === "student") return false;
  return context.submissionExists;
}
