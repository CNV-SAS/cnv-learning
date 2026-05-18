// Template puro para el email de calificacion publicada. Funcion
// idempotente: dado el mismo input, retorna el mismo {subject,
// html, text}.
//
// HTML inline con estilos por elemento (clientes de email strip
// los <style> tags). Wordmark text-only "CNV Learning" sin
// imagenes externas (Outlook/Gmail strict las bloquean por
// default).
//
// Escape basico de HTML: <, >, & en feedback + studentName +
// titulos. Saltos de linea del feedback -> <br>. Sin DOMPurify
// (defensa en profundidad minima, el feedback viene del docente
// trusted).

interface GradingPublishedParams {
  studentName: string;
  courseTitle: string;
  assignmentTitle: string;
  finalGrade: number;
  maxScore: number;
  feedback: string;
  assignmentUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function feedbackToHtml(feedback: string): string {
  return escapeHtml(feedback).replace(/\n/g, "<br>");
}

export interface GradingPublishedEmail {
  subject: string;
  html: string;
  text: string;
}

export function gradingPublishedTemplate(
  params: GradingPublishedParams,
): GradingPublishedEmail {
  const subject = `Recibiste tu calificación en ${params.assignmentTitle}`;

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
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Recibiste tu calificación</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.studentName)}, tu docente publicó la calificación de tu entrega.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0 0 8px 0;">${escapeHtml(params.courseTitle)}</p>
      <p style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a;">${escapeHtml(params.assignmentTitle)}</p>
      <p style="margin: 0 0 16px 0;">
        <span style="font-size: 36px; font-weight: 900; color: #047857;">${params.finalGrade}</span>
        <span style="font-size: 18px; color: #64748b; margin-left: 4px;">/ ${params.maxScore}</span>
      </p>
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 8px 0;">Feedback del docente</p>
      <p style="font-size: 14px; line-height: 1.6; color: #0f172a; margin: 0;">${feedbackToHtml(params.feedback)}</p>
    </div>
    <a href="${params.assignmentUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Ver detalle de la tarea</a>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Este es un correo automático de CNV Learning. No respondas a este mensaje.
    </p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${params.studentName},`,
    ``,
    `Tu docente publicó la calificación de tu entrega.`,
    ``,
    `Curso: ${params.courseTitle}`,
    `Tarea: ${params.assignmentTitle}`,
    `Nota: ${params.finalGrade} / ${params.maxScore}`,
    ``,
    `Feedback del docente:`,
    params.feedback,
    ``,
    `Ver detalle: ${params.assignmentUrl}`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático, no respondas.`,
  ].join("\n");

  return { subject, html, text };
}
