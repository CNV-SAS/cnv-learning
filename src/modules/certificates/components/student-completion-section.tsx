// StudentCompletionSection (Bloque 22.5): seccion de la ruta
// /certificates con la lista de Constancias de Finalizacion del
// student (uno por curso completado al 100%).
//
// Server Component. Para cada cert renderiza:
//   - Titulo del curso.
//   - Badge status (Valida / Revocada).
//   - Fecha de emision / revocacion.
//   - Boton Descargar PDF (api/certificates/[id]/pdf).
//   - Boton Verificar (publica /verify/[id]).
//
// Si revocado: motivo (cert.revoked_reason) en muted.

import { Award, Download, ExternalLink, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface CompletionCertView {
  id: string;
  courseTitle: string;
  status: "valid" | "revoked";
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

interface StudentCompletionSectionProps {
  certificates: CompletionCertView[];
}

export function StudentCompletionSection({
  certificates,
}: StudentCompletionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Constancias de Finalización
        </CardTitle>
        <CardDescription>
          Constancias emitidas por CNV Learning al completar un curso
          al 100%. Cada una incluye un código QR y un hash SHA-256 para
          verificación pública.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no tienes Constancias de Finalización. Completa un curso
            al 100% para emitirla automáticamente.
          </p>
        ) : (
          <ul className="space-y-3">
            {certificates.map((cert) => {
              const isRevoked = cert.status === "revoked";
              return (
                <li
                  key={cert.id}
                  className="space-y-2 rounded-2xl border border-border bg-card/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-emerald-700" />
                        <span className="font-medium">{cert.courseTitle}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isRevoked && cert.revokedAt
                          ? `Revocada el ${format(new Date(cert.revokedAt), "d MMM y", { locale: es })}`
                          : `Emitida el ${format(new Date(cert.issuedAt), "d MMM y", { locale: es })}`}
                      </p>
                    </div>
                    {isRevoked ? (
                      <Badge
                        variant="secondary"
                        className="bg-rose-100 text-rose-700"
                      >
                        <ShieldOff className="mr-1 h-3 w-3" />
                        Revocada
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        Válida
                      </Badge>
                    )}
                  </div>
                  {isRevoked && cert.revokedReason && (
                    <p className="text-xs text-rose-700">
                      Motivo: {cert.revokedReason}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={`/verify/${cert.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Verificar
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/api/certificates/${cert.id}/pdf`}>
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Descargar PDF
                      </a>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
