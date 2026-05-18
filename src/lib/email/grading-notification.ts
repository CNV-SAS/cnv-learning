// High-level helper para enviar el email de calificacion publicada.
// Combina template + cliente Resend. El service de grading llama
// este helper tras audit; ambos (template y send) son
// fault-tolerant.
//
// Construye el assignmentUrl desde courseId + assignmentId usando
// NEXT_PUBLIC_APP_URL (env var ya documentada en DEPLOY.md).
// Fallback al dominio canonico de produccion si la env var no
// esta (caso edge).

import { sendEmail } from "./resend";
import { gradingPublishedTemplate } from "./templates/grading-published";

const DEFAULT_APP_URL = "https://lms.cnvsystem.com";

interface SendGradingPublishedEmailParams {
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  courseId: string;
  assignmentId: string;
  assignmentTitle: string;
  finalGrade: number;
  maxScore: number;
  feedback: string;
}

function buildAssignmentUrl(
  courseId: string,
  assignmentId: string,
): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
  return `${base}/learn/${courseId}/assignment/${assignmentId}`;
}

export async function sendGradingPublishedEmail(
  params: SendGradingPublishedEmailParams,
): Promise<void> {
  const { subject, html, text } = gradingPublishedTemplate({
    studentName: params.studentName,
    courseTitle: params.courseTitle,
    assignmentTitle: params.assignmentTitle,
    finalGrade: params.finalGrade,
    maxScore: params.maxScore,
    feedback: params.feedback,
    assignmentUrl: buildAssignmentUrl(params.courseId, params.assignmentId),
  });

  await sendEmail({
    to: params.studentEmail,
    subject,
    html,
    text,
  });
}
