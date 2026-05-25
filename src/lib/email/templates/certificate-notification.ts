// Template puro para emails de certificate.issued y
// certificate.revoked. Funcion idempotente: dado el mismo input,
// mismo {subject, html, text}.
//
// 22.5: copy student "Certificado" -> "Constancia de Finalizacion"
// para diferenciarlo del catalogo expandido (Constancia, Academica,
// Profesional Conectado CNV). Email cubre solo la Constancia.
//
// Issued: subject "Tu Constancia de Finalizacion de {course} esta
// lista" + CTAs "Descargar PDF" y "Ver verificacion publica".
//
// Revoked: subject "Tu Constancia de Finalizacion de {course} fue
// revocada" + motivo + CTA "Ver verificacion publica" (que muestra
// el estado revocado al verificador).
//
// HTML inline siguiendo el patron de grading-published y
// announcement: wordmark CNV Learning + card emerald (issued) o
// rose (revoked) + CTA. Sin assets externos.
//
// Escape HTML basico (< > &) en campos user-supplied (motivo de
// revocacion, nombres) para defensa minima si en futuro entran
// nombres con caracteres especiales.

export type CertificateEmailKind = "issued" | "revoked";

interface IssuedParams {
  kind: "issued";
  studentName: string;
  courseTitle: string;
  pdfUrl: string;
  verifyUrl: string;
}

interface RevokedParams {
  kind: "revoked";
  studentName: string;
  courseTitle: string;
  verifyUrl: string;
  reason: string;
}

type CertificateNotificationParams = IssuedParams | RevokedParams;

export interface CertificateNotificationEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function certificateNotificationTemplate(
  params: CertificateNotificationParams,
): CertificateNotificationEmail {
  return params.kind === "issued"
    ? buildIssued(params)
    : buildRevoked(params);
}

function buildIssued(params: IssuedParams): CertificateNotificationEmail {
  const subject = `Tu Constancia de Finalización de ${params.courseTitle} está lista`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 32px;">
      <span style="color: #047857;">CNV</span> <span style="color: #0f172a;">Learning</span>
    </div>
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Tu Constancia de Finalización está lista</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.studentName)}, completaste el curso y recibiste tu Constancia de Finalización.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0 0 8px 0;">CURSO COMPLETADO</p>
      <p style="font-size: 18px; font-weight: 600; margin: 0; color: #0f172a;">${escapeHtml(params.courseTitle)}</p>
    </div>
    <p style="margin: 0 0 16px 0;">
      <a href="${params.pdfUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Descargar constancia (PDF)</a>
    </p>
    <p style="margin: 0 0 24px 0;">
      <a href="${params.verifyUrl}" style="font-size: 13px; color: #047857; text-decoration: underline;">Ver página pública de verificación</a>
    </p>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Este es un correo automático de CNV Learning. No respondas a este mensaje.
    </p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${params.studentName},`,
    ``,
    `Completaste el curso "${params.courseTitle}" y recibiste tu Constancia de Finalización.`,
    ``,
    `Descargar el PDF: ${params.pdfUrl}`,
    `Verificación pública: ${params.verifyUrl}`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático, no respondas.`,
  ].join("\n");

  return { subject, html, text };
}

function buildRevoked(
  params: RevokedParams,
): CertificateNotificationEmail {
  const subject = `Tu Constancia de Finalización de ${params.courseTitle} fue revocada`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 32px;">
      <span style="color: #047857;">CNV</span> <span style="color: #0f172a;">Learning</span>
    </div>
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Tu Constancia de Finalización fue revocada</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.studentName)}, te informamos que la Constancia de Finalización correspondiente al curso indicado fue revocada.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b91c1c; margin: 0 0 8px 0;">CURSO</p>
      <p style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a;">${escapeHtml(params.courseTitle)}</p>
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b91c1c; margin: 0 0 8px 0;">MOTIVO DE LA REVOCACIÓN</p>
      <p style="font-size: 14px; line-height: 1.6; color: #0f172a; margin: 0;">${escapeHtml(params.reason)}</p>
    </div>
    <p style="margin: 0 0 24px 0;">
      <a href="${params.verifyUrl}" style="font-size: 13px; color: #047857; text-decoration: underline;">Ver página pública de verificación</a>
    </p>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Si tienes dudas sobre la revocación, contacta a soporte en soporte@cnvsystem.com.
    </p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${params.studentName},`,
    ``,
    `Te informamos que la Constancia de Finalización correspondiente al curso "${params.courseTitle}" fue revocada.`,
    ``,
    `Motivo de la revocación:`,
    params.reason,
    ``,
    `Verificación pública: ${params.verifyUrl}`,
    ``,
    `Si tienes dudas, contacta a soporte en soporte@cnvsystem.com.`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático.`,
  ].join("\n");

  return { subject, html, text };
}
