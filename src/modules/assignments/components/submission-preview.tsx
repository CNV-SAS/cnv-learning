// SubmissionPreview: muestra la entrega del estudiante al docente.
// Server Component. Discrimina por assignment.type:
//   - essay: card con essay_text + whitespace-pre-wrap para
//     preservar saltos de linea del Textarea.
//   - file_upload: card con link "Descargar entrega" + icono Download.
//     signedUrl viene resuelto desde el page server-side (TTL 60 min
//     para sesion de calificacion completa).

import { Download, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Assignment, Submission } from "../types";

interface SubmissionPreviewProps {
  submission: Submission;
  assignment: Assignment;
  signedUrl?: string | null;
}

export function SubmissionPreview({
  submission,
  assignment,
  signedUrl,
}: SubmissionPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Entrega del estudiante</CardTitle>
      </CardHeader>
      <CardContent>
        {assignment.type === "essay" && submission.essay_text ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {submission.essay_text}
          </p>
        ) : assignment.type === "file_upload" && submission.storage_path ? (
          signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Descargar entrega del estudiante
                </span>
              </div>
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo generar el link de descarga del archivo.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            La entrega no tiene contenido visible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
