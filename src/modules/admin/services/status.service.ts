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

const STORAGE_LIST_LIMIT = 1000;

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

  // Recursivo solo a 1 nivel (top + 1 sub-carpeta) seria mas
  // exhaustivo; en MVP basta con el listado plano que cubre archivos
  // directos del bucket. Los buckets que usan {userId}/ subfolder
  // (avatars, academic-certificates) requeririan recursion para
  // contar correctamente; lo marcamos en una nota futura.
  async listStorageBuckets(): Promise<BucketStat[]> {
    const supabase = createAdminClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error || !buckets) {
      logger.warn("status: listBuckets failed", {
        error: error?.message ?? "unknown",
      });
      return [];
    }

    const stats: BucketStat[] = [];
    for (const bucket of buckets) {
      const { data: objects, error: listError } = await supabase.storage
        .from(bucket.name)
        .list("", { limit: STORAGE_LIST_LIMIT });
      if (listError || !objects) {
        stats.push({
          name: bucket.name,
          objectCount: 0,
          totalBytes: 0,
          truncated: false,
          errorMessage: listError?.message ?? "list failed",
        });
        continue;
      }
      const totalBytes = objects.reduce(
        (sum, o) => sum + (o.metadata?.size ?? 0),
        0,
      );
      stats.push({
        name: bucket.name,
        objectCount: objects.length,
        totalBytes,
        truncated: objects.length === STORAGE_LIST_LIMIT,
        errorMessage: null,
      });
    }
    return stats.sort((a, b) => a.name.localeCompare(b.name));
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
