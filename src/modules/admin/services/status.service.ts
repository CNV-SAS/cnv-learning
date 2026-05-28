// Status service (Bloque 22.6, refactor 23 smoke fix #2): expone
// health-checks operativos del sistema para /admin/status. Solo el
// admin puede verlo (la pagina verifica canAccessAdmin).
//
// Mezcla de metricas reales y verificaciones estaticas. Para evitar
// confusion sobre que tan "vivo" es cada chip del status panel,
// documentamos explicitamente la naturaleza de cada uno:
//
//   1. pingDatabase: REAL. Head count contra profiles + latency.
//      Si la BD no responde, falla aqui inmediatamente.
//
//   2. listStorageBuckets: REAL (post-Bloque 23 smoke fix #2). Llama
//      al RPC public.get_storage_stats (migracion 0035) que agrega
//      count + bytes leyendo storage.objects directamente. Reemplaza
//      el intento anterior con storage.list("") que solo veia nivel
//      raiz y reportaba 0 MB en buckets con {userId}/ o {courseId}/
//      subfolders.
//
//   3. getDeployInfo: REAL. Lee VERCEL_* env vars que Vercel inyecta
//      en runtime con metadata del commit. Local dev devuelve
//      available=false.
//
//   4. getSentryInfo: ESTATICO. Solo verifica que SENTRY_DSN existe
//      como env var y parsea el host/projectId. NO hace request al
//      endpoint de Sentry para verificar conectividad real. Si Sentry
//      esta caido o el DSN apunta a un proyecto invalido, este check
//      sigue diciendo "Configurado". El admin tiene que abrir el
//      projectUrl manualmente para validar la integracion real.
//
// Toda la data se calcula on-demand server-side (force-dynamic en
// la pagina). Cero cache: el admin necesita freshness.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/core/logger/logger";

export interface DatabasePing {
  ok: boolean;
  latencyMs: number;
  errorMessage: string | null;
}

export interface BucketStat {
  name: string;
  objectCount: number;
  totalBytes: number;
  truncated: boolean;
  errorMessage: string | null;
}

export interface DeployInfo {
  available: boolean;
  commitSha: string | null;
  commitShortSha: string | null;
  commitMessage: string | null;
  branch: string | null;
  environment: string | null;
  deploymentUrl: string | null;
}

export interface SentryInfo {
  configured: boolean;
  projectUrl: string | null;
}

export const statusService = {
  async pingDatabase(): Promise<DatabasePing> {
    const supabase = createAdminClient();
    const start = Date.now();
    try {
      const { error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const latencyMs = Date.now() - start;
      if (error) {
        return { ok: false, latencyMs, errorMessage: error.message };
      }
      return { ok: true, latencyMs, errorMessage: null };
    } catch (e) {
      const latencyMs = Date.now() - start;
      return {
        ok: false,
        latencyMs,
        errorMessage: e instanceof Error ? e.message : String(e),
      };
    }
  },

  // Bloque 23 smoke fix #2: lee count + bytes por bucket via RPC
  // public.get_storage_stats (migracion 0035). El RPC agrega en SQL
  // sobre storage.objects, evitando los issues de .list("") (solo
  // nivel raiz) y .schema("storage") (PostgREST no whitelist-ea
  // schemas externos por default). El cliente admin tiene
  // permission grant via authenticated (la pagina ya tiene
  // canAccessAdmin gate).
  async listStorageBuckets(): Promise<BucketStat[]> {
    const supabase = createAdminClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error || !buckets) {
      logger.warn("status: listBuckets failed", {
        error: error?.message ?? "unknown",
      });
      return [];
    }

    const { data: stats, error: rpcError } = await supabase.rpc(
      "get_storage_stats",
    );

    if (rpcError || !stats) {
      logger.warn("status: get_storage_stats RPC failed", {
        error: rpcError?.message ?? "unknown",
      });
      // Fallback: lista los buckets con 0 bytes y error message; al
      // menos el admin ve que existen los buckets aunque la suma fallo.
      return buckets
        .map((b) => ({
          name: b.name,
          objectCount: 0,
          totalBytes: 0,
          truncated: false,
          errorMessage: rpcError?.message ?? "RPC failed",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Map rapido por bucket_id para join contra el listBuckets (que
    // incluye buckets vacios; el RPC no devuelve fila si bucket sin
    // archivos).
    const statsByBucket = new Map(
      stats.map((s) => [
        s.bucket_id,
        { count: Number(s.file_count), bytes: Number(s.total_bytes) },
      ]),
    );

    return buckets
      .map((bucket) => {
        const stat = statsByBucket.get(bucket.name) ?? { count: 0, bytes: 0 };
        return {
          name: bucket.name,
          objectCount: stat.count,
          totalBytes: stat.bytes,
          truncated: false,
          errorMessage: null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getDeployInfo(): DeployInfo {
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
    if (!commitSha) {
      return {
        available: false,
        commitSha: null,
        commitShortSha: null,
        commitMessage: null,
        branch: null,
        environment: process.env.VERCEL_ENV ?? null,
        deploymentUrl: null,
      };
    }
    return {
      available: true,
      commitSha,
      commitShortSha: commitSha.slice(0, 7),
      commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      environment: process.env.VERCEL_ENV ?? null,
      deploymentUrl: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null,
    };
  },

  // ESTATICO. Solo confirma que existe SENTRY_DSN como env var y
  // parsea el host/projectId del DSN para construir el link al
  // dashboard. NO hace HTTP request al endpoint Sentry para validar
  // que el DSN es funcional ni que el proyecto existe ahi. Si Sentry
  // esta caido o el DSN apunta a un proyecto borrado, este check
  // sigue diciendo "Configurado". El admin tiene que abrir el
  // projectUrl manualmente para validar la integracion real.
  //
  // Parseo del DSN: https://{key}@{host}/{projectId}. Construimos
  // project URL https://{host}/projects/{projectId} (rough; el host
  // exacto es sentry.io o subdominio org-especifico, depende del
  // tenant). El admin clickea y aterriza en la pagina de eventos.
  getSentryInfo(): SentryInfo {
    const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      return { configured: false, projectUrl: null };
    }
    try {
      const url = new URL(dsn);
      const projectId = url.pathname.replace(/^\//, "");
      const host = url.host;
      // Sentry.io tiene UI en sentry.io/organizations/<org>/issues/?project=<id>
      // pero sin el org name solo podemos linkear a la home. Mejor:
      // construir el link al proyecto especifico via project ID.
      const projectUrl = projectId
        ? `https://${host.replace(/^o\d+\.ingest\./, "")}/issues/?project=${projectId}`
        : `https://${host}`;
      return { configured: true, projectUrl };
    } catch {
      return { configured: true, projectUrl: null };
    }
  },
};
