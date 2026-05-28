-- Migration: 0035_storage_stats_rpc
-- Why: Bloque 23 smoke fix #2. statusService.listStorageBuckets
-- reportaba 0 MB en los buckets que usan subfolder ({userId}/) porque
-- la Storage API .list("") solo lista nivel raiz. El primer fix
-- intentado (.schema("storage" as never).from("objects")) fallaba en
-- runtime PostgREST con "Invalid schema: storage" porque el cliente
-- no whitelist-ea schemas distintos a public por default.
--
-- Solucion: funcion RPC publica en schema public que internamente
-- consulta storage.objects agregando por bucket_id. Hardened con
-- search_path empty + identificadores calificados (convencion
-- DATABASE.md). SECURITY DEFINER necesario para que la funcion
-- ejecute con privilegios del owner (postgres) y pueda leer
-- storage.objects (no accesible a roles normales).
--
-- Permisos: revocamos default de PUBLIC y otorgamos solo a
-- authenticated. El callsite (/admin/status) tiene canAccessAdmin
-- gate como policy TS adicional.

create or replace function public.get_storage_stats()
returns table (
  bucket_id text,
  file_count bigint,
  total_bytes bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    storage.objects.bucket_id,
    count(*)::bigint as file_count,
    coalesce(
      sum((storage.objects.metadata->>'size')::bigint),
      0
    )::bigint as total_bytes
  from storage.objects
  group by storage.objects.bucket_id;
$$;

comment on function public.get_storage_stats() is
  'Agrega count + total bytes por bucket leyendo storage.objects. SECURITY DEFINER expone una vista de admin sin requerir privilegios sobre el schema storage.';

revoke all on function public.get_storage_stats() from public;
grant execute on function public.get_storage_stats() to authenticated;
