// Status service (Bloque 22.6): expone health-checks operativos del
// sistema para /admin/status. Solo el admin puede verlo (la pagina
// verifica canAccessAdmin).
//
// Cubre 4 fuentes:
//   1. pingDatabase: head count contra profiles. OK = BD respondiendo.
//   2. listStorageBuckets: por bucket retorna count + bytes totales
//      via storage.list() con limit 1000 (suficiente para MVP; si
//      algun bucket pasa de 1000 objetos, queda indicador truncated).
//   3. getDeployInfo: lee VERCEL_* env vars que Vercel inyecta en
//      runtime con metadata del commit deploy.
//   4. getSentryInfo: parsea SENTRY_DSN para extraer project URL.
//
// Toda la data se calcula on-demand server-side (force-dynamic en
// la pagina). Cero cache: el admin necesita freshness.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/core/logger/logger";

// Shape de un row de storage.objects que necesitamos (Bloque 23 smoke
// fix AJUSTE 1). Los types autogenerados de Database solo incluyen
// schema public; declaramos localmente lo minimo para la query.
interface StorageObjectRow {
  bucket_id: string | null;
  metadata: { size?: number } | null;
}

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

  // Bloque 23 smoke fix AJUSTE 1: query directa contra
  // storage.objects en lugar de Storage API .list() por bucket.
  // .list("") solo lista nivel raiz, y los buckets que usan path
  // {userId}/ (avatars, academic-certificates, submissions) o
  // {courseId}/ (course-resources) quedaban reportando 0 MB porque
  // su nivel raiz esta vacio. La query agrega count + sum(metadata
  // .size) por bucket_id directamente.
  //
  // Para acceder al schema 'storage' usamos `.schema('storage' as
  // never)` que silencia TS (el Database autogen solo incluye
  // schema public). Service role bypassa RLS de storage.objects.
  async listStorageBuckets(): Promise<BucketStat[]> {
    const supabase = createAdminClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error || !buckets) {
      logger.warn("status: listBuckets failed", {
        error: error?.message ?? "unknown",
      });
      return [];
    }

    const { data: rows, error: queryError } = await (
      supabase.schema("storage" as never) as unknown as {
        from: (table: string) => {
          select: (cols: string) => Promise<{
            data: StorageObjectRow[] | null;
            error: { message: string } | null;
          }>;
        };
      }
    )
      .from("objects")
      .select("bucket_id, metadata");

    if (queryError || !rows) {
      logger.warn("status: storage.objects query failed", {
        error: queryError?.message ?? "unknown",
      });
      // Fallback: lista los buckets con 0 bytes y error message; al
      // menos el admin ve que existen los buckets aunque la suma fallo.
      return buckets
        .map((b) => ({
          name: b.name,
          objectCount: 0,
          totalBytes: 0,
          truncated: false,
          errorMessage: queryError?.message ?? "query failed",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Aggregate por bucket_id en JS. Para MVP con <100 archivos el
    // overhead es trivial; si supera 10k habria que mover el group by
    // a una funcion SQL via RPC.
    const statsByBucket = new Map<string, { count: number; bytes: number }>();
    for (const row of rows) {
      if (!row.bucket_id) continue;
      const current = statsByBucket.get(row.bucket_id) ?? {
        count: 0,
        bytes: 0,
      };
      current.count += 1;
      current.bytes += row.metadata?.size ?? 0;
      statsByBucket.set(row.bucket_id, current);
    }

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
