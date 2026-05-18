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

import { z } from "zod";
import { notFound } from "next/navigation";

const uuidSchema = z.string().uuid();

// Valida que el param sea un UUID v4. Llama notFound() si no,
// previene que un valor invalido llegue al repo y se convierta
// en InfrastructureError. Retorna el valor ya tipado como string
// para que el caller lo use directo.
export function requireUuidParam(value: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) notFound();
  return result.data;
}
