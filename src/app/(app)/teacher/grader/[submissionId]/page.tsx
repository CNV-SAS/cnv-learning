// Vista del grader: detalle de una submission + form para publicar
// calificacion. Si ya hay grading existente, muestra read-only (sin
// form en MVP; re-grade polish post-MVP).
//
// signedUrl del archivo (cuando file_upload) generado con TTL 60 min
// para que la sesion de calificacion no se quede sin acceso si el
// docente se distrae unos minutos.

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessTeacherInbox } from "@/modules/auth/policies";
import {
  submissionRepository,
  gradingRepository,
  assignmentRepository,
  submissionStorageRepository,
} from "@/modules/assignments/data";
import { canGradeAssignment } from "@/modules/assignments/policies";
import { GradeDisplay } from "@/modules/assignments/components/grade-display";
import { GraderForm } from "@/modules/assignments/components/grader-form";
import { SubmissionPreview } from "@/modules/assignments/components/submission-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

const GRADER_SIGNED_URL_TTL_SECONDS = 60 * 60;

interface GraderPageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function GraderPage({ params }: GraderPageProps) {
  const submissionId = requireUuidParam((await params).submissionId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTeacherInbox(user)) redirect("/unauthorized");

  const submission = await submissionRepository.findById(submissionId);
  if (
    !canGradeAssignment(user, { submissionExists: submission !== null }) ||
    !submission
  ) {
    notFound();
  }

  const assignment = await assignmentRepository.findById(
    submission.assignment_id,
  );
  if (!assignment) notFound();

  const [grading, student, signedUrl] = await Promise.all([
    gradingRepository.findBySubmissionId(submission.id),
    profileRepository.findById(submission.user_id),
    submission.storage_path
      ? submissionStorageRepository.getSignedUrl(
          submission.storage_path,
          GRADER_SIGNED_URL_TTL_SECONDS,
        )
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Calificación
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {assignment.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Estudiante: {student?.full_name ?? "(desconocido)"}
        </p>
        <p className="text-xs text-muted-foreground">
          Puntaje máximo: {assignment.max_score}
        </p>
      </div>

      <SubmissionPreview
        submission={submission}
        assignment={assignment}
        signedUrl={signedUrl}
      />

      {grading ? (
        <GradeDisplay grading={grading} assignment={assignment} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publicar calificación</CardTitle>
          </CardHeader>
          <CardContent>
            <GraderForm
              submissionId={submission.id}
              maxScore={assignment.max_score}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
