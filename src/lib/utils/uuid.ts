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

export const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
