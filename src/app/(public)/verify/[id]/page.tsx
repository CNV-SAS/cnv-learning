// Verificacion publica de Constancia de Finalizacion. Server
// Component, sin auth.
//
// 22.5: rename copy a "Constancia de Finalizacion" para alinear
// con el catalogo expandido de certificados. /verify-corporate/[id]
// (Bloque 22.4) atiende los Profesionales Conectados CNV; la
// Certificacion Academica no tiene verificacion publica.
//
// El user que escanea el QR del PDF cae aqui. La pagina muestra:
//   - Status: valido / revocado / no encontrado.
//   - Nombre del estudiante + curso + fecha de emision.
//   - Si revocado: fecha de revocacion + razon.
//   - Hash SHA-256 corto + ID corto para que el viewer compare
//     con el PDF que tiene en mano.
//
// dynamic=force-dynamic + revalidate=0: cada visita re-fetch de
// la BD. Si el admin revoca un cert, la siguiente carga muestra
// "revocado" sin cache stale (consideracion B del plan B12).
//
// Sin notFound() en cert missing: la pagina muestra estado
// "no encontrado" en lugar de 404 para mejorar UX de verificacion
// (un cert ID falso debe dar feedback claro, no error de browser).

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ShieldOff, AlertCircle } from "lucide-react";
import { certificateRepository } from "@/modules/certificates/data";
import { Card, CardContent } from "@/components/ui/card";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyCertificatePage({
  params,
}: VerifyPageProps) {
  const { id: rawId } = await params;
  if (!UUID_FORMAT.test(rawId)) {
    notFound();
  }

  const certificate = await certificateRepository.findByIdForVerify(rawId);

  if (!certificate) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Verificación de Constancia
          </h1>
          <p className="text-sm text-muted-foreground">
            Resultado de la consulta contra los registros de CNV Learning.
          </p>
        </div>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="flex items-start gap-3 py-6">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-amber-900">
                Constancia no encontrada
              </p>
              <p className="text-sm text-amber-900/80">
                No se encontró una Constancia con el
                código solicitado. Verifica el enlace o consulta con el
                emisor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRevoked = certificate.status === "revoked";
  const isUpdate = certificate.kind === "update";
  // Bloque post-23: copy contextual segun kind (completion vs update).
  const certificateLabel = isUpdate
    ? "Constancia de Actualización"
    : "Constancia de Finalización";
  const issuedAtLabel = format(
    new Date(certificate.issued_at),
    "d 'de' MMMM 'de' yyyy",
    { locale: es },
  );
  const revokedAtLabel = certificate.revoked_at
    ? format(new Date(certificate.revoked_at), "d 'de' MMMM 'de' yyyy", {
        locale: es,
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Verificación de {certificateLabel}
        </h1>
        <p className="text-sm text-muted-foreground">
          Resultado de la consulta contra los registros de CNV Learning.
        </p>
      </div>

      {isRevoked ? (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="flex items-start gap-3 py-6">
            <ShieldOff
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-rose-900">
                {certificateLabel} revocada
              </p>
              <p className="text-sm text-rose-900/80">
                Esta {certificateLabel.toLowerCase()} fue revocada y ya
                no es válida.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-start gap-3 py-6">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-emerald-900">
                {certificateLabel} válida
              </p>
              <p className="text-sm text-emerald-900/80">
                Emitida por CNV Learning. Coincide con los registros.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Otorgado a
            </p>
            <p className="font-display text-xl font-bold text-foreground">
              {certificate.studentName}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Curso
            </p>
            <p className="font-medium text-foreground">
              {certificate.courseTitle}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Fecha de emisión
              </p>
              <p className="text-sm text-foreground">{issuedAtLabel}</p>
            </div>
            {isRevoked && revokedAtLabel && (
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Fecha de revocación
                </p>
                <p className="text-sm text-foreground">{revokedAtLabel}</p>
              </div>
            )}
          </div>
          {isRevoked && certificate.revoked_reason && (
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Motivo de revocación
              </p>
              <p className="text-sm text-foreground">
                {certificate.revoked_reason}
              </p>
            </div>
          )}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Código de la constancia
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              ID {certificate.id} · Hash {certificate.hash.slice(0, 16)}
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        El hash es una huella SHA-256 sobre datos de la constancia en el
        momento de emisión. Sirve como marca de integridad institucional.
      </p>
    </div>
  );
}
