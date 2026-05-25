// Verificacion publica del certificado "Profesional Conectado CNV"
// (Bloque 22.4). Server Component, sin auth.
//
// Mismo layout y comportamiento que /verify/[id] (Constancia de
// Finalizacion), con copy diferenciado y SIN curso (el corporate no
// se asocia a uno).
//
// dynamic=force-dynamic + revalidate=0: cada visita re-fetch de la
// BD. Si el admin revoca, la siguiente carga muestra "revocado" sin
// cache stale.

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Award, CheckCircle2, ShieldOff } from "lucide-react";
import { corporateCertificateRepository } from "@/modules/certificates/data";
import { Card, CardContent } from "@/components/ui/card";
import { UUID_FORMAT } from "@/lib/utils/uuid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface VerifyCorporatePageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyCorporateCertificatePage({
  params,
}: VerifyCorporatePageProps) {
  const { id: rawId } = await params;
  if (!UUID_FORMAT.test(rawId)) {
    notFound();
  }

  const certificate =
    await corporateCertificateRepository.findForVerify(rawId);

  if (!certificate) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Verificación de Profesional Conectado CNV
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
                Certificado no encontrado
              </p>
              <p className="text-sm text-amber-900/80">
                No se encontró un certificado Profesional Conectado CNV
                con el código solicitado. Verifica el enlace o consulta
                con el emisor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRevoked = certificate.status === "revoked";
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
          Verificación de Profesional Conectado CNV
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
                Certificado revocado
              </p>
              <p className="text-sm text-rose-900/80">
                Este certificado fue revocado y ya no es válido.
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
                Certificado válido
              </p>
              <p className="text-sm text-emerald-900/80">
                Emitido por Connected Nutrition Ventures SAS. Coincide
                con los registros.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Certificado de Profesional Conectado CNV
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Otorgado a
            </p>
            <p className="font-display text-xl font-bold text-foreground">
              {certificate.studentName}
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
              Código del certificado
            </p>
            <p className="font-mono text-xs text-muted-foreground break-all">
              ID {certificate.id} · Hash {certificate.hash.slice(0, 16)}
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        El hash es una huella SHA-256 sobre los datos del certificado en
        el momento de emisión. Sirve como marca de integridad
        institucional de Connected Nutrition Ventures SAS.
      </p>
    </div>
  );
}
