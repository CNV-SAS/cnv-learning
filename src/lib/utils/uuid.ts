// UUID format regex compartido. Reusado por:
// - lib/utils/params.ts (requireUuidParam para route segments)
// - modules/<dominio>/validations/... (Zod schemas de server actions
//   que reciben UUIDs como input)
//
// NO valida RFC 4122 (version 1-5) porque el seed usa UUIDs
// deterministicos version 0 (00000000-0000-0000-0000-XXXXXXXXXXXX).
// Postgres uuid type acepta cualquier string con este shape, asi
// que el chequeo formal es suficiente para evitar el roundtrip al
// repo. Ver sub-bloque 4.4-fix2.
//
// IMPORTANTE para schemas Zod: NO USAR z.string().uuid().
// Zod's .uuid() valida RFC 4122 estricto (versiones 1-7 con bits
// de variante correctos en la posicion 13 y 17) y rechaza los
// UUIDs v0 del seed. Esto provoca toast "Invalid uuid" en cualquier
// form que envie un id deterministico al server action.
// USAR siempre: z.string().regex(UUID_FORMAT, "ID inválido").
// (Bug detectado en smoke del Bloque 19; ver SPRINTS.md.)

export const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
