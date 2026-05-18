// AttachmentList: lista de descargables de la leccion. Recibe pares
// {attachment, signedUrl} ya resueltos por el page server-side.
// Server Component (link href ya cargado, no requiere interactividad).
//
// Convencion: el page se encarga de calcular signed URLs por cada
// attachment via lessonAttachmentRepository.getSignedUrl en el render
// (TTL 15 min). Este componente NO toca storage; solo presenta.

import { Download, FileText } from "lucide-react";
import type { LessonAttachment } from "../types";

export interface AttachmentWithUrl {
  attachment: LessonAttachment;
  signedUrl: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentListProps {
  attachments: AttachmentWithUrl[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold tracking-tight">
        Material descargable
      </h2>
      <ul className="space-y-2">
        {attachments.map(({ attachment, signedUrl }) => (
          <li key={attachment.id}>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {attachment.display_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size_bytes)}
                  </span>
                </div>
              </div>
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
