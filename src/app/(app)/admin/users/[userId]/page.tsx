// /admin/users/[userId]: detalle de un usuario con cards de gestion.
// 4 cards base: cambiar rol, reseteo password, suspension, zona
// destructiva (eliminar). El service maneja todos los guards (anti-
// self, anti-lockout, isLastAdmin) en cada accion.
//
// Si target.role === 'student' se agregan 2 cards adicionales
// (Bloque 22.3): Certificacion Academica (upload PDF universidad
// externa) y Profesional Conectado CNV (emitir/revocar manual).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  ExternalLink,
  FileText,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatBogotaDate } from "@/lib/utils/format-date";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import {
  adminEnrollmentRepository,
  adminUserRepository,
} from "@/modules/admin/data";
import {
  academicCertificateRepository,
  corporateCertificateRepository,
} from "@/modules/certificates/data";
import { UpdateRoleForm } from "@/modules/admin/components/update-role-form";
import { SuspendUserDialog } from "@/modules/admin/components/suspend-user-dialog";
import { UnsuspendUserButton } from "@/modules/admin/components/unsuspend-user-button";
import { SendPasswordResetButton } from "@/modules/admin/components/send-password-reset-button";
import { DeleteUserDialog } from "@/modules/admin/components/delete-user-dialog";
import { UploadAcademicDialog } from "@/modules/certificates/components/upload-academic-dialog";
import { DeleteAcademicButton } from "@/modules/certificates/components/delete-academic-button";
import { IssueCorporateButton } from "@/modules/certificates/components/issue-corporate-button";
import { RevokeCorporateButton } from "@/modules/certificates/components/revoke-corporate-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Profile } from "@/modules/auth/types";

function roleLabel(role: "student" | "teacher" | "admin"): string {
  if (role === "admin") return "Administrador";
  if (role === "teacher") return "Docente";
  return "Estudiante";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const actor = await profileRepository.getCurrentUser();
  if (!actor) redirect("/login");
  if (!canAccessAdmin(actor)) notFound();

  const target = await adminUserRepository.findProfileById(userId);
  if (!target) notFound();

  const isSelf = target.id === actor.id;
  const isSuspended = await adminUserRepository.isUserSuspended(target.id);

  // Datos de certificados solo si el target es student (los cards
  // se renderizan condicionalmente; evita pegar el TTFB con queries
  // irrelevantes para teacher/admin).
  const certData = target.role === "student"
    ? await loadStudentCertificateData(target.id)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a usuarios
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              {target.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">{target.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{roleLabel(target.role)}</Badge>
            {isSuspended ? (
              <Badge
                variant="secondary"
                className="bg-rose-100 text-rose-700"
              >
                <ShieldOff className="mr-1 h-3 w-3" />
                Suspendido
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Activo
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Registrado el{" "}
          {format(new Date(target.created_at), "d MMM y", { locale: es })}
        </p>
      </div>

      {isSelf && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            Estás viendo tu propio perfil. Las acciones de cambio de rol,
            suspensión y eliminación están deshabilitadas para evitar
            lockout accidental.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inscripciones</CardTitle>
          <CardDescription>
            Asigna cursos al usuario o cancela inscripciones existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/admin/users/${target.id}/enrollments`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Gestionar inscripciones
            </Link>
          </Button>
        </CardContent>
      </Card>

      {certData && (
        <>
          <AcademicCertificatesCard
            target={target}
            certificates={certData.academic}
            availableCourses={certData.availableCoursesForAcademic}
          />
          <CorporateCertificateCard
            target={target}
            corporate={certData.corporate}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rol</CardTitle>
          <CardDescription>
            Cambiar el rol modifica los permisos del usuario en toda la
            plataforma. No puedes cambiar tu propio rol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateRoleForm
            userId={target.id}
            currentRole={target.role}
            disabled={isSelf}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reseteo de contraseña</CardTitle>
          <CardDescription>
            Envía al usuario un email con un enlace para configurar una
            nueva contraseña. El enlace es válido por 1 hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendPasswordResetButton userId={target.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suspensión</CardTitle>
          <CardDescription>
            Un usuario suspendido no puede iniciar sesión. La suspensión
            es reversible. No puedes suspenderte a ti mismo ni al último
            administrador del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              No puedes suspender tu propia cuenta.
            </p>
          ) : isSuspended ? (
            <UnsuspendUserButton userId={target.id} />
          ) : (
            <SuspendUserDialog
              userId={target.id}
              userName={target.full_name}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base text-rose-700">
            Zona destructiva
          </CardTitle>
          <CardDescription>
            Eliminar borra permanentemente la cuenta y sus datos
            relacionados. Los registros de auditoría se preservan con el
            actor anonimizado. No puedes eliminarte a ti mismo ni al
            último administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              No puedes eliminar tu propia cuenta.
            </p>
          ) : (
            <DeleteUserDialog
              userId={target.id}
              userEmail={target.email}
              userName={target.full_name}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- helpers de certificados (solo para student) ----------

interface AcademicCertWithCourse {
  id: string;
  courseId: string;
  courseTitle: string;
  uploadedAt: string;
  signedUrl: string | null;
  notes: string | null;
}

interface CorporateCertSummary {
  id: string;
  issuedAt: string;
  hash: string;
}

interface StudentCertificateData {
  academic: AcademicCertWithCourse[];
  availableCoursesForAcademic: Array<{ id: string; title: string }>;
  corporate: CorporateCertSummary | null;
}

async function loadStudentCertificateData(
  studentId: string,
): Promise<StudentCertificateData> {
  // Tres queries en paralelo: certs academicos, cert corporativo
  // vigente, enrollments con curso joineado (para mapear course_id
  // -> title y para construir availableCourses del upload dialog).
  const [academicRows, corporateRow, enrollments] = await Promise.all([
    academicCertificateRepository.listForUser(studentId),
    corporateCertificateRepository.findValidByUser(studentId),
    adminEnrollmentRepository.listForUserWithCourse(studentId),
  ]);

  // Map courseId -> title (incluye enrollments activos y cancelados
  // para resolver el title de certs viejos cuyo enrollment ya no
  // existe activo).
  const courseTitleById = new Map<string, string>();
  for (const { course } of enrollments) {
    courseTitleById.set(course.id, course.title);
  }

  // Cursos activos = candidatos para upload de nuevo cert.
  const activeCourses = enrollments
    .filter((e) => e.enrollment.is_active)
    .map((e) => ({ id: e.course.id, title: e.course.title }));

  // Pre-fetch signed URL de cada PDF (TTL 15 min). Sequential ok:
  // expect 0-1 certs por student en MVP (1 curso por cohorte).
  const academic: AcademicCertWithCourse[] = [];
  const certCourseIds = new Set<string>();
  for (const cert of academicRows) {
    const signedUrl = await academicCertificateRepository.getSignedUrl(
      cert.storage_path,
    );
    academic.push({
      id: cert.id,
      courseId: cert.course_id,
      courseTitle:
        courseTitleById.get(cert.course_id) ?? "Curso (no disponible)",
      uploadedAt: cert.uploaded_at,
      signedUrl,
      notes: cert.notes,
    });
    certCourseIds.add(cert.course_id);
  }

  const availableCoursesForAcademic = activeCourses.filter(
    (c) => !certCourseIds.has(c.id),
  );

  const corporate = corporateRow
    ? {
        id: corporateRow.id,
        issuedAt: corporateRow.issued_at,
        hash: corporateRow.hash,
      }
    : null;

  return { academic, availableCoursesForAcademic, corporate };
}

function AcademicCertificatesCard({
  target,
  certificates,
  availableCourses,
}: {
  target: Profile;
  certificates: AcademicCertWithCourse[];
  availableCourses: Array<{ id: string; title: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Certificación Académica</CardTitle>
        <CardDescription>
          Sube el PDF del certificado emitido por la universidad mexicana
          asociada al diplomado. Un certificado por curso. El estudiante
          podrá descargarlo desde su perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no se ha subido ningún certificado académico para este
            estudiante.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {certificates.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cert.courseTitle}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subido el {formatBogotaDate(cert.uploadedAt)}
                  </div>
                  {cert.notes && (
                    <p className="text-xs text-muted-foreground">
                      {cert.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {cert.signedUrl ? (
                    <Button asChild variant="ghost" size="sm">
                      <a
                        href={cert.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Ver PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      PDF no disponible
                    </span>
                  )}
                  <DeleteAcademicButton
                    certificateId={cert.id}
                    courseTitle={cert.courseTitle}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {availableCourses.length === 0
              ? certificates.length === 0
                ? "Este estudiante no tiene inscripciones activas. Asigna un curso primero."
                : "Todos los cursos activos ya tienen certificado académico."
              : "Selecciona un curso enrolled y sube el PDF (máx. 20 MB)."}
          </p>
          <UploadAcademicDialog
            userId={target.id}
            availableCourses={availableCourses}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CorporateCertificateCard({
  target,
  corporate,
}: {
  target: Profile;
  corporate: CorporateCertSummary | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Profesional Conectado CNV
        </CardTitle>
        <CardDescription>
          Certificado corporativo de la red CNV. Se emite manualmente
          por decisión institucional. El estudiante puede verificarlo
          públicamente con un código QR y un hash SHA-256.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {corporate ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                <Award className="mr-1 h-3 w-3" />
                Vigente
              </Badge>
              <span className="text-xs text-muted-foreground">
                Emitido el{" "}
                {format(new Date(corporate.issuedAt), "d MMM y", {
                  locale: es,
                })}
              </span>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
              {corporate.hash}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`/verify-corporate/${corporate.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  Verificar
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/corporate-certificates/${corporate.id}/pdf`}>
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Descargar PDF
                </a>
              </Button>
              <RevokeCorporateButton
                certificateId={corporate.id}
                studentName={target.full_name}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Este estudiante aún no tiene el certificado Profesional
              Conectado CNV.
            </p>
            <IssueCorporateButton
              userId={target.id}
              studentName={target.full_name}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
