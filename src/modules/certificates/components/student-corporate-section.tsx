// StudentCorporateSection (Bloque 22.5): seccion de la ruta
// /certificates con el certificado "Profesional Conectado CNV"
// (emision manual por admin).
//
// Muestra el vigente si existe + lista historica de revocados (uno
// tipico por student en MVP; el historico cubre el caso de revoke
// + re-issue posterior).
//
// Botones Descargar PDF y Verificacion publica se difieren a 22.4
// (apuntan al endpoint /api/corporate-certificates/[id]/pdf y a
// /verify-corporate/[id]). Por ahora se renderizan deshabilitados
// con texto "Próximamente".

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

export interface CorporateCertView {
  id: string;
  status: "valid" | "revoked";
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  hash: string;
}

interface StudentCorporateSectionProps {
  certificates: CorporateCertView[];
}

export function StudentCorporateSection({
  certificates,
}: StudentCorporateSectionProps) {
  const valid = certificates.find((c) => c.status === "valid") ?? null;
  const revokedHistory = certificates.filter((c) => c.status === "revoked");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Profesional Conectado CNV
        </CardTitle>
        <CardDescription>
          Certificado corporativo de la red CNV. Lo emite manualmente
          el equipo de administración como reconocimiento institucional.
          Cada certificado incluye un código de verificación pública
          con hash SHA-256.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {valid ? (
          <CorporateCard cert={valid} isValid />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no tienes el certificado Profesional Conectado CNV. El
            equipo de administración lo otorga por decisión institucional.
          </p>
        )}
        {revokedHistory.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Historial revocado
            </p>
            {revokedHistory.map((cert) => (
              <CorporateCard key={cert.id} cert={cert} isValid={false} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CorporateCard({
  cert,
  isValid,
}: {
  cert: CorporateCertView;
  isValid: boolean;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Award
              className={
                isValid ? "h-4 w-4 text-emerald-700" : "h-4 w-4 text-rose-700"
              }
            />
            <span className="font-medium">Profesional Conectado CNV</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isValid
              ? `Emitido el ${format(new Date(cert.issuedAt), "d MMM y", { locale: es })}`
              : cert.revokedAt
                ? `Revocado el ${format(new Date(cert.revokedAt), "d MMM y", { locale: es })}`
                : "Revocado"}
          </p>
        </div>
        {isValid ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700"
          >
            Vigente
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-rose-100 text-rose-700"
          >
            <ShieldOff className="mr-1 h-3 w-3" />
            Revocado
          </Badge>
        )}
      </div>
      {!isValid && cert.revokedReason && (
        <p className="text-xs text-rose-700">Motivo: {cert.revokedReason}</p>
      )}
      <div className="rounded-md bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
        {cert.hash}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" disabled title="Disponible próximamente">
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          Verificar (próximamente)
        </Button>
        <Button variant="outline" size="sm" disabled title="Disponible próximamente">
          <Download className="mr-1 h-3.5 w-3.5" />
          Descargar PDF (próximamente)
        </Button>
      </div>
    </div>
  );
}
