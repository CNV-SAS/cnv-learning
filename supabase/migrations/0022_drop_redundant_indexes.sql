-- Migration: 0022_drop_redundant_indexes
-- Why: limpiar indice duplicado detectado en Bloque 1 sub-bloque 1.3
-- (commit e80c634). DATABASE.md linea 104 pedia explicitamente
-- "create index courses_slug_idx on courses(slug)", pero la columna
-- ya tenia "slug text not null unique" que crea automaticamente el
-- indice unique courses_slug_key sobre la misma columna. Tener ambos
-- es overhead innecesario: cada insert/update/delete actualiza los
-- dos indices, sin beneficio en reads (Postgres puede usar el unique
-- para cualquier lookup, range query, ORDER BY, etc.).
--
-- IF EXISTS para idempotencia: si por alguna razon el indice ya fue
-- dropeado en una BD downstream (dev local, branch), no falla la
-- migracion.
--
-- DATABASE.md sera actualizado en el mismo sub-bloque (drop de la
-- linea redundante del bloque sql de courses).

drop index if exists public.courses_slug_idx;
