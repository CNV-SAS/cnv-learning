// StudentAcademicSection (Bloque 22.5): seccion de la ruta
// /certificates con los PDFs academicos subidos por admin (emitidos
// por la universidad mexicana asociada al diplomado).
//
// Read-only para el student: solo Ver/Descargar el PDF. La emision
// y eliminacion la hace admin desde /admin/users/[id] (Bloque 22.3).

import { FileText, Download } from "lucide-react";
import { formatBogotaDate } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface AcademicCertView {
  id: string;
  courseTitle: string;
  uploadedAt: string;
  signedUrl: string | null;
  notes: string | null;
}

interface StudentAcademicSectionProps {
  certificates: AcademicCertView[];
}

export function StudentAcademicSection({
  certificates,
}: StudentAcademicSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Certificación Académica</CardTitle>
        <CardDescription>
          Certificados emitidos por la universidad mexicana asociada al
          diplomado. CNV Learning los hospeda y los pone a tu disposición
          para descarga.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no se ha emitido tu certificación académica. Una vez la
            universidad la expida, la verás aquí.
          </p>
        ) : (
          <ul className="space-y-3">
            {certificates.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cert.courseTitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Emitida el {formatBogotaDate(cert.uploadedAt)}
                  </p>
                  {cert.notes && (
                    <p className="text-xs text-muted-foreground">
                      {cert.notes}
                    </p>
                  )}
                </div>
                {cert.signedUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={cert.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Descargar PDF
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    PDF no disponible
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
