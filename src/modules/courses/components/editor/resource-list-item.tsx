// ResourceListItem (Bloque 20.2): renderiza un recurso individual
// con metadata + acciones Edit/Delete. Server Component (sin estado).
// Editor view: NO incluye link de descarga (lo cubre la vista student
// en 20.3 con signed URLs).

import { ExternalLink, File as FileIcon, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EditResourceDialog } from "./edit-resource-dialog";
import { DeleteResourceDialog } from "./delete-resource-dialog";
import {
  COURSE_RESOURCE_MIME_LABEL,
  formatBytes,
} from "@/modules/courses/data/course-resource-constants";
import type { CourseResource } from "@/modules/courses/types";

interface ResourceListItemProps {
  resource: CourseResource;
}

export function ResourceListItem({ resource }: ResourceListItemProps) {
  const isFile = resource.kind === "file";
  const mimeLabel =
    resource.mime_type !== null
      ? (COURSE_RESOURCE_MIME_LABEL[resource.mime_type] ?? resource.mime_type)
      : null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isFile ? (
              <FileIcon className="h-4 w-4" />
            ) : (
              <LinkIcon className="h-4 w-4" />
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
              {!isFile && resource.external_url && (
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver enlace
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditResourceDialog resource={resource} />
          <DeleteResourceDialog
            resourceId={resource.id}
            resourceTitle={resource.title}
          />
        </div>
      </CardContent>
    </Card>
  );
}
