// AttachmentList: lista de descargables de la leccion. Recibe pares
// {attachment, signedUrl} ya resueltos por el page server-side.
// Server Component (link href ya cargado, no requiere interactividad).
//
// Bloque 21.2 (rediseno): pillow style del prototipo Gildardo en
// "Entregables y Recursos". Pills emerald-50 con icon download +
// display_name + size en lugar del card vertical anterior.

import { Download } from "lucide-react";
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
        Entregables y recursos
      </h2>
      <ul className="flex flex-wrap gap-2">
        {attachments.map(({ attachment, signedUrl }) => (
          <li key={attachment.id}>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
            >
              <Download className="h-4 w-4" />
              <span>{attachment.display_name}</span>
              <span className="text-xs text-emerald-700/70">
                {formatFileSize(attachment.size_bytes)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
