// High-level helpers para enviar emails de certificate issued y
// revoked. Combinan template + cliente Resend. Ambos son fault-
// tolerant (sendEmail no throw).
//
// URLs construidas desde NEXT_PUBLIC_APP_URL con fallback al
// dominio canonico de produccion (DEPLOY.md), mismo patron que
// grading-notification y announcement-notification.

import { sendEmail } from "./resend";
import { certificateNotificationTemplate } from "./templates/certificate-notification";

const DEFAULT_APP_URL = "https://lms.cnvsystem.com";

function buildBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
}

interface SendIssuedParams {
  recipientEmail: string;
  studentName: string;
  courseTitle: string;
  certificateId: string;
  // Bloque post-23: distingue completion vs update para subject + copy.
  certificateKind: "completion" | "update";
}

interface SendRevokedParams {
  recipientEmail: string;
  studentName: string;
  courseTitle: string;
  certificateId: string;
  reason: string;
}

export async function sendCertificateIssuedEmail(
  params: SendIssuedParams,
): Promise<void> {
  const base = buildBaseUrl();
  const { subject, html, text } = certificateNotificationTemplate({
    kind: "issued",
    studentName: params.studentName,
    courseTitle: params.courseTitle,
    pdfUrl: `${base}/api/certificates/${params.certificateId}/pdf`,
    verifyUrl: `${base}/verify/${params.certificateId}`,
    certificateKind: params.certificateKind,
  });

  await sendEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}

export async function sendCertificateRevokedEmail(
  params: SendRevokedParams,
): Promise<void> {
  const base = buildBaseUrl();
  const { subject, html, text } = certificateNotificationTemplate({
    kind: "revoked",
    studentName: params.studentName,
    courseTitle: params.courseTitle,
    verifyUrl: `${base}/verify/${params.certificateId}`,
    reason: params.reason,
  });

  await sendEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}
