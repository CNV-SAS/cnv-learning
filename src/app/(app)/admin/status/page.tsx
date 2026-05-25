// /admin/status: panel operativo (Bloque 22.6) con 4 secciones:
// 1) Ping a BD (latencia, OK/fail). 2) Storage por bucket
// (objetos, bytes). 3) Last deploy (Vercel env vars). 4) Sentry
// status (configurado + link).
//
// Server Component, force-dynamic: el admin necesita ver freshness
// real, no respuesta cacheada. Cero metricas de negocio (esas
// viven en /admin); aqui es solo health/infra.

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Box,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitCommit,
  HardDrive,
  ShieldOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { statusService } from "@/modules/admin/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default async function AdminStatusPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const [dbPing, buckets, deploy, sentry] = await Promise.all([
    statusService.pingDatabase(),
    statusService.listStorageBuckets(),
    Promise.resolve(statusService.getDeployInfo()),
    Promise.resolve(statusService.getSentryInfo()),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <Activity className="mt-1 h-7 w-7 text-emerald-700" />
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-black tracking-tight">
              Estado del sistema
            </h1>
            <p className="text-sm text-muted-foreground">
              Health-checks operativos en tiempo real: base de datos,
              storage por bucket, último deploy y observabilidad.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base de datos</CardTitle>
          <CardDescription>
            Ping head-count contra <code>profiles</code> usando el cliente
            de servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {dbPing.ok ? (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Operativa
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-rose-100 text-rose-700">
              <XCircle className="mr-1 h-3 w-3" />
              Caída
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Latencia: {dbPing.latencyMs} ms
          </span>
          {dbPing.errorMessage && (
            <span className="text-xs text-rose-700">
              {dbPing.errorMessage}
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage por bucket</CardTitle>
          <CardDescription>
            Conteo y peso aproximado del primer nivel de cada bucket.
            Los buckets con subcarpetas por usuario (<code>avatars</code>,
            <code>academic-certificates</code>) pueden subreportar el
            número real de objetos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No se pudieron listar los buckets. Revisa la conexión con
              Supabase Storage.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Bucket</th>
                    <th className="px-4 py-2 text-right">Objetos</th>
                    <th className="px-4 py-2 text-right">Tamaño</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {buckets.map((b) => (
                    <tr key={b.name}>
                      <td className="px-4 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right align-top tabular-nums">
                        {b.objectCount.toLocaleString("es")}
                        {b.truncated && (
                          <span className="ml-1 text-xs text-amber-700">
                            +
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right align-top tabular-nums">
                        {formatBytes(b.totalBytes)}
                      </td>
                      <td className="px-4 py-2 align-top">
                        {b.errorMessage ? (
                          <span className="text-xs text-rose-700">
                            {b.errorMessage}
                          </span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700"
                          >
                            OK
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Último deploy</CardTitle>
          <CardDescription>
            Metadatos del último deploy de Vercel (env vars inyectadas
            en runtime).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {deploy.available ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700"
                >
                  {deploy.environment ?? "vercel"}
                </Badge>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <GitCommit className="h-3.5 w-3.5" />
                  <span className="font-mono">{deploy.commitShortSha}</span>
                </span>
                {deploy.branch && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    {deploy.branch}
                  </span>
                )}
              </div>
              {deploy.commitMessage && (
                <p className="text-sm text-foreground">
                  {deploy.commitMessage}
                </p>
              )}
              <p className="font-mono text-xs text-muted-foreground break-all">
                {deploy.commitSha}
              </p>
              {deploy.deploymentUrl && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={deploy.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    {deploy.deploymentUrl}
                  </a>
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground"
              >
                <Box className="mr-1 h-3 w-3" />
                Sin metadata de deploy
              </Badge>
              <p className="text-xs text-muted-foreground">
                Las env vars <code>VERCEL_GIT_COMMIT_*</code> no están
                disponibles. Esto es esperable en local; en producción
                indica que el deploy no se hizo desde la integración
                Git de Vercel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentry</CardTitle>
          <CardDescription>
            Estado de la integración de captura de errores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {sentry.configured ? (
            <>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Configurado
              </Badge>
              {sentry.projectUrl && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={sentry.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Abrir issues en Sentry
                  </a>
                </Button>
              )}
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700"
            >
              <ShieldOff className="mr-1 h-3 w-3" />
              No configurado (define SENTRY_DSN)
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
