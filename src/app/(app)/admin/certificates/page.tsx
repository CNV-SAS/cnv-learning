// /admin/certificates: lista de todos los certificados emitidos
// con accion "Revocar" para los validos.
//
// Admin-only via canAccessAdmin policy. listAllWithDetails usa
// admin client + embed join (admin tiene RLS para todo pero el
// admin client da predictabilidad).
//
// La tabla es estatica para MVP (sin filtros/busqueda/paginacion);
// para 10 alumnos = max 10 certs visibles. En Bloque 14 (admin
// panel completo) se evalua paginacion + filtros si el volumen
// lo justifica.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { certificateRepository } from "@/modules/certificates/data";
import { RevokeCertificateButton } from "@/modules/certificates/components/revoke-certificate-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminCertificatesPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const certificates = await certificateRepository.listAllWithDetails();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Certificados
        </h1>
        <p className="text-sm text-muted-foreground">
          Listado completo de certificados emitidos. Puedes revocar
          un certificado válido indicando un motivo; la revocación
          es inmediata en la página pública de verificación.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Aún no se han emitido certificados en el sistema.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Emitido</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.map((cert) => {
                const isRevoked = cert.status === "revoked";
                return (
                  <tr key={cert.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{cert.studentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {cert.studentEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {cert.courseTitle}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground">
                      {format(new Date(cert.issued_at), "d MMM y", {
                        locale: es,
                      })}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isRevoked ? (
                        <Badge
                          variant="secondary"
                          className="bg-rose-100 text-rose-700"
                        >
                          <ShieldOff className="mr-1 h-3 w-3" />
                          Revocado
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Válido
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
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
                        {!isRevoked && (
                          <RevokeCertificateButton
                            certificateId={cert.id}
                            studentName={cert.studentName}
                            courseTitle={cert.courseTitle}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
