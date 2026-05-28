// /certificates: hub del student con los 3 tipos de certificados
// del catalogo expandido + las 5 insignias (Bloque 22.5).
//
// Acceso: solo students. Teachers/admins son redirigidos al dashboard
// (no consumen estos assets; el admin gestiona desde /admin/users/[id]
// del 22.3).
//
// Secciones en orden (decision del planning):
//   1. Constancias de Finalizacion (Bloque 12, certificateRepository).
//   2. Certificacion Academica (Bloque 22.2, PDF subido por admin).
//   3. Profesional Conectado CNV (Bloque 22.2, emision manual).
//   4. Mis Insignias (Bloque 22.5, expanded view 5 badges).
//
// Pre-fetch: 6 queries en paralelo (certs x3 + cursos + badges +
// signed URLs). Es una pagina secundaria, no critical path; el
// overhead es aceptable y se paga una sola vez por entrada.

import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import {
  certificateRepository,
  academicCertificateRepository,
  corporateCertificateRepository,
} from "@/modules/certificates/data";
import { badgesService } from "@/modules/progress/services/badges.service";
import { progressService } from "@/modules/progress/services/progress.service";
import { StudentCompletionSection } from "@/modules/certificates/components/student-completion-section";
import { StudentAcademicSection } from "@/modules/certificates/components/student-academic-section";
import { StudentCorporateSection } from "@/modules/certificates/components/student-corporate-section";
import { ExpandedBadgesCard } from "@/modules/progress/components";
import type { CompletionCertView } from "@/modules/certificates/components/student-completion-section";
import type { AcademicCertView } from "@/modules/certificates/components/student-academic-section";
import type { CorporateCertView } from "@/modules/certificates/components/student-corporate-section";

export default async function CertificatesPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");

  // Cursos enrolled (activos) para resolver titles + primary course
  // que alimenta badges (Junior/Senior/Master del primer curso).
  const courses = await courseRepository.listForUser(user.id);
  const primaryCourseId = courses[0]?.id ?? null;
  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  const [
    completionCerts,
    academicCerts,
    corporateCerts,
    badgeEntries,
    primarySummary,
  ] = await Promise.all([
    certificateRepository.listForUser(user.id),
    academicCertificateRepository.listForUser(user.id),
    corporateCertificateRepository.listForUser(user.id),
    badgesService.getStudentBadges(user.id, primaryCourseId),
    primaryCourseId
      ? progressService.getCourseSummary(user.id, primaryCourseId)
      : Promise.resolve(null),
  ]);

  // Resolver views con title + signed URLs para academic.
  const completionViews: CompletionCertView[] = completionCerts.map(
    (cert) => ({
      id: cert.id,
      courseTitle: courseTitleById.get(cert.course_id) ?? "Curso",
      status: cert.status,
      issuedAt: cert.issued_at,
      revokedAt: cert.revoked_at,
      revokedReason: cert.revoked_reason,
      kind: cert.kind,
    }),
  );

  const academicViews: AcademicCertView[] = [];
  for (const cert of academicCerts) {
    const signedUrl = await academicCertificateRepository.getSignedUrl(
      cert.storage_path,
    );
    academicViews.push({
      id: cert.id,
      courseTitle: courseTitleById.get(cert.course_id) ?? "Curso",
      uploadedAt: cert.uploaded_at,
      signedUrl,
      notes: cert.notes,
    });
  }

  const corporateViews: CorporateCertView[] = corporateCerts.map((cert) => ({
    id: cert.id,
    status: cert.status,
    issuedAt: cert.issued_at,
    revokedAt: cert.revoked_at,
    revokedReason: cert.revoked_reason,
    hash: cert.hash,
  }));

  const progressPct = primarySummary?.progress.percentage ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <Award className="mt-1 h-7 w-7 text-emerald-700" />
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Mis certificados
          </h1>
          <p className="text-sm text-muted-foreground">
            Aquí encuentras tus Constancias de Finalización, tu
            Certificación Académica, tu reconocimiento como Profesional
            Conectado CNV y tu colección de insignias.
          </p>
        </div>
      </div>

      {/* 23 smoke fix AJUSTE 4: Constancias y Academica son POR
          CURSO. Si el student aun no esta enrollado en ningun curso
          (courses.length === 0), no mostrar esas secciones. Pro CNV
          es independiente del curso y siempre se muestra. */}
      {courses.length > 0 && (
        <>
          <StudentCompletionSection certificates={completionViews} />
          <StudentAcademicSection certificates={academicViews} />
        </>
      )}
      <StudentCorporateSection certificates={corporateViews} />
      <ExpandedBadgesCard
        entries={badgeEntries}
        progressPercentage={progressPct}
      />
    </div>
  );
}
