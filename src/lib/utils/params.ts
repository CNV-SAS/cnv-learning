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

// Regex de formato UUID (8-4-4-4-12 hex). NO valida RFC 4122
// estricto (que exige version 1-5 en el primer nibble del tercer
// segmento). Motivo del relax: el seed usa UUIDs deterministicos
// formato 00000000-0000-0000-0000-XXXXXXXXXXXX (version 0) para
// reproducibilidad de fixtures; un schema RFC-strict (z.string().uuid()
// en Zod 4) los rechazaria como invalidos.
//
// Postgres uuid type acepta cualquier string con este formato, asi
// que el chequeo formal es suficiente para evitar el roundtrip al
// repo y la InfrastructureError downstream. Strings tipo "hola",
// "abc", "<uuid>h" no pasan.
const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valida que el param tenga formato UUID. Llama notFound() si no.
// Retorna el valor para uso directo (mantiene el call site limpio).
export function requireUuidParam(value: string): string {
  if (!UUID_FORMAT.test(value)) notFound();
  return value;
}
