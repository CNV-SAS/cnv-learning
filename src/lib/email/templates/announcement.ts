// Template puro para el email de anuncio. Funcion idempotente:
// dado el mismo input, retorna el mismo {subject, html, text}.
//
// Body se trata como plain text (sin markdown render) per
// consideracion C del plan del Bloque 10: maxima compatibilidad
// con clientes de email. HTML inline escapa < > & y convierte
// \n a <br> para preservar saltos de linea visuales.
//
// Subject diferenciado por scope:
//   - course: "Nuevo anuncio: {title}"
//   - global: "Anuncio global: {title}"

import type { AnnouncementScope } from "@/modules/announcements/types";

interface AnnouncementParams {
  scope: AnnouncementScope;
  recipientName: string;
  authorName: string;
  // Solo presente para scope='course' (UI puede mostrar el curso).
  courseTitle?: string;
  title: string;
  body: string;
  // URL canonica del LMS para CTA "Abrir CNV Learning".
  appUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bodyToHtml(body: string): string {
  return escapeHtml(body).replace(/\n/g, "<br>");
}

export interface AnnouncementEmail {
  subject: string;
  html: string;
  text: string;
}

export function announcementTemplate(
  params: AnnouncementParams,
): AnnouncementEmail {
  const subject =
    params.scope === "course"
      ? `Nuevo anuncio: ${params.title}`
      : `Anuncio global: ${params.title}`;

  const headerLabel =
    params.scope === "course" && params.courseTitle
      ? params.courseTitle
      : params.scope === "global"
        ? "Anuncio global"
        : "Anuncio";

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
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">${escapeHtml(params.title)}</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.recipientName)}, ${escapeHtml(params.authorName)} publicó un anuncio.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0 0 12px 0;">${escapeHtml(headerLabel)}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #0f172a; margin: 0;">${bodyToHtml(params.body)}</p>
    </div>
    <a href="${params.appUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Abrir CNV Learning</a>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Este es un correo automático de CNV Learning. No respondas a este mensaje.
    </p>
  </div>
</body>
</html>`;

  const courseLine =
    params.scope === "course" && params.courseTitle
      ? `Curso: ${params.courseTitle}`
      : null;

  const text = [
    `Hola ${params.recipientName},`,
    ``,
    `${params.authorName} publicó un anuncio.`,
    ``,
    courseLine,
    `Título: ${params.title}`,
    ``,
    params.body,
    ``,
    `Abrir CNV Learning: ${params.appUrl}`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático, no respondas.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { subject, html, text };
}
