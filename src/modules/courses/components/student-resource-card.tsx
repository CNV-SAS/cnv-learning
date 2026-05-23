// StudentResourceCard (Bloque 20.3): tarjeta read-only para el
// student. Muestra metadata + boton descarga (signed URL para files)
// o "Abrir enlace" (external URL para links). Server Component.

import {
  Download,
  ExternalLink,
  File as FileIcon,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  COURSE_RESOURCE_MIME_LABEL,
  formatBytes,
} from "@/modules/courses/data/course-resource-constants";
import type { CourseResource } from "@/modules/courses/types";

interface StudentResourceCardProps {
  resource: CourseResource;
  // Si kind='file', signed URL pre-resuelta por el page. Si null,
  // el blob no existe en Storage (estado raro), se renderiza
  // mensaje "no disponible".
  signedUrl: string | null;
}

export function StudentResourceCard({
  resource,
  signedUrl,
}: StudentResourceCardProps) {
  const isFile = resource.kind === "file";
  const mimeLabel =
    resource.mime_type !== null
      ? (COURSE_RESOURCE_MIME_LABEL[resource.mime_type] ?? resource.mime_type)
      : null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            {isFile ? (
              <FileIcon className="h-5 w-5" />
            ) : (
              <LinkIcon className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">{resource.title}</h3>
            {resource.description && (
              <p className="text-sm text-muted-foreground">
                {resource.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {isFile && mimeLabel && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {mimeLabel}
                </span>
              )}
              {isFile && resource.size_bytes !== null && (
                <span>{formatBytes(Number(resource.size_bytes))}</span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {isFile ? (
            signedUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Descargar
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                No disponible
              </span>
            )
          ) : (
            resource.external_url && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Abrir enlace
                </a>
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
