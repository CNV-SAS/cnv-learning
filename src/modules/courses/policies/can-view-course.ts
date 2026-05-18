// Policy: el usuario puede ver el curso solicitado.
//
// Patron de defensa en profundidad (establecido en Bloque 4 sub-bloque
// 4.2, referencia para todos los policies futuros del MVP):
//
//   - Policy (esta funcion) = primera linea de defensa. Sync, pura,
//     testable sin mocks. Sirve para early failure con un error claro
//     (AuthorizationError) en lugar de devolver datos vacios. Cumple
//     regla dura 3 de ARCHITECTURE.md: el chequeo de rol vive aqui,
//     NUNCA en pages o componentes UI.
//
//   - RLS (Postgres Row Level Security) = ultima linea, real security
//     boundary. Para courses la policy "Enrolled users view their
//     courses" y companeras hacen el filtrado SQL: si el course no es
//     accesible, courseRepository.findById retorna null sin necesidad
//     de que esta policy lo sepa.
//
//   - Las dos deben coincidir. Si difieren, gana RLS (es la fuente
//     real de seguridad). La policy queda redundante pero documenta
//     la intencion y cubre el caso de un bug futuro en RLS.
//
// Para Bloque 4 (solo read) la policy resulta thin: admin ve todo,
// el resto se rige por `courseExists` que el caller pre-resuelve via
// courseRepository.findById. Para acciones mutativas futuras
// (gradeAssignment, issueCertificate) las policies tendran logica
// propia mas alla de delegar en RLS.

import type { AuthenticatedUser } from "@/modules/auth/types";

export interface CourseAccessContext {
  // True si courseRepository.findById retorno != null (RLS aprobo).
  courseExists: boolean;
}

export function canViewCourse(
  user: AuthenticatedUser,
  context: CourseAccessContext,
): boolean {
  if (user.role === "admin") return true;
  return context.courseExists;
}
