// Utilities para validar params de Server Components antes de
// pasarlos a repositorios.
//
// Motivacion (sub-bloque 4.4-fix): un UUID malformado o cualquier
// string arbitrario en la URL (ej. /learn/hola) llegaba al repo,
// Postgres rechazaba la query con "invalid input syntax for type
// uuid", y el repo lo elevaba como InfrastructureError -> error
// boundary. Lo correcto es 404, porque desde la perspectiva del
// user esa ruta simplemente no existe.
//
// Patron: cualquier page con [courseId], [lessonId], [submissionId],
// etc. en sus params debe envolver el valor con requireUuidParam
// antes de la primera query al repo.

import { notFound } from "next/navigation";
import { UUID_FORMAT } from "./uuid";

// Valida que el param tenga formato UUID. Llama notFound() si no.
// Retorna el valor para uso directo (mantiene el call site limpio).
export function requireUuidParam(value: string): string {
  if (!UUID_FORMAT.test(value)) notFound();
  return value;
}
