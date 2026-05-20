// /admin/audit: lista paginada (20/page server-side) de audit_logs.
// Filtros opcionales: event (dropdown) y actor (input texto ILIKE).
//
// Defensive null para actor_id (post-migracion 0024 puede ser null
// si el actor fue eliminado): fallback a actor_email (snapshot)
// preservado en la row, o "(usuario eliminado)" si tampoco hay.
//
// Sin Server Action (puro server: el form GET re-renderiza la
// pagina con los query params nuevos). Mas sencillo + cacheable.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { auditRepository } from "@/modules/audit/data";
import { formatBogotaDateTime } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PER_PAGE = 20;

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

function buildPageUrl(
  baseParams: { event?: string; actor?: string },
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (baseParams.event) params.set("event", baseParams.event);
  if (baseParams.actor) params.set("actor", baseParams.actor);
  const qs = params.toString();
  return qs ? `/admin/audit?${qs}` : "/admin/audit";
}

function metadataPreview(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  try {
    const json = JSON.stringify(metadata);
    if (json.length <= 200) return json;
    return `${json.slice(0, 200)}…`;
  } catch {
    return null;
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    event?: string;
    actor?: string;
  }>;
}) {
  const actor = await profileRepository.getCurrentUser();
  if (!actor) redirect("/login");
  if (!canAccessAdmin(actor)) notFound();

  const params = await searchParams;
  const page = parsePage(params.page);
  const eventFilter = params.event?.trim() || undefined;
  const actorFilter = params.actor?.trim() || undefined;

  const [result, distinctEvents] = await Promise.all([
    auditRepository.listPaginated({
      page,
      perPage: PER_PAGE,
      event: eventFilter,
      actorEmail: actorFilter,
    }),
    auditRepository.listDistinctEvents(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / PER_PAGE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
        <h1 className="font-display text-3xl font-black tracking-tight">
          Auditoría
        </h1>
        <p className="text-sm text-muted-foreground">
          Registro inmutable de eventos críticos: login admin, cambios
          de rol, eliminaciones, calificaciones, emisiones de
          certificado, anuncios. {result.total.toLocaleString("es")} eventos
          registrados.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="get" className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="event">Evento</Label>
              <select
                id="event"
                name="event"
                defaultValue={eventFilter ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="">Todos los eventos</option>
                {distinctEvents.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actor">Actor (email)</Label>
              <Input
                id="actor"
                name="actor"
                defaultValue={actorFilter ?? ""}
                placeholder="email parcial"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Filtrar</Button>
              <Button asChild variant="outline">
                <Link href="/admin/audit">Limpiar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.rows.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No se encontraron eventos con los filtros aplicados.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Recurso</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.rows.map((row) => {
                const actorLabel = row.actor_email
                  ? row.actor_email
                  : row.actor_id
                    ? "(actor)"
                    : "(usuario eliminado)";
                const meta = metadataPreview(row.metadata);
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatBogotaDateTime(row.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {row.event}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {row.actor_id === null && !row.actor_email ? (
                        <span className="italic text-muted-foreground">
                          (usuario eliminado)
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground">
                          {actorLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {row.resource_type ? (
                        <span className="font-mono">
                          {row.resource_type}
                          {row.resource_id ? (
                            <>
                              <br />
                              <span className="text-[10px]">
                                {row.resource_id.slice(0, 8)}…
                              </span>
                            </>
                          ) : null}
                        </span>
                      ) : (
                        <span className="italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {meta ? (
                        <pre className="max-w-xs whitespace-pre-wrap break-all rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                          {meta}
                        </pre>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          sin metadata
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Página {page} de {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            asChild={hasPrev}
            variant="outline"
            size="sm"
            disabled={!hasPrev}
          >
            {hasPrev ? (
              <Link
                href={buildPageUrl(
                  { event: eventFilter, actor: actorFilter },
                  page - 1,
                )}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Link>
            ) : (
              <span>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </span>
            )}
          </Button>
          <Button
            asChild={hasNext}
            variant="outline"
            size="sm"
            disabled={!hasNext}
          >
            {hasNext ? (
              <Link
                href={buildPageUrl(
                  { event: eventFilter, actor: actorFilter },
                  page + 1,
                )}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            ) : (
              <span>
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
