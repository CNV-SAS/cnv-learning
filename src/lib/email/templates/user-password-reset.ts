// Template puro para el email de reset de contrasena forzado por
// un admin (a diferencia de forgot-password publico que es self-
// service). El user recibe este email cuando el admin clickea
// "Forzar reset de contrasena" en /admin/users/[id].
//
// Subject: "Reseteo de contrasena en CNV Learning".
// Card emerald (consistente con resto de templates).

interface UserPasswordResetParams {
  recipientName: string;
  resetUrl: string;
}

export interface UserPasswordResetEmail {
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

export function userPasswordResetTemplate(
  params: UserPasswordResetParams,
): UserPasswordResetEmail {
  const subject = "Reseteo de contraseña en CNV Learning";

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
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Reseteo de contraseña</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.recipientName)}, un administrador de CNV Learning solicitó el reseteo de tu contraseña.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0 0 12px 0;">PRÓXIMO PASO</p>
      <p style="font-size: 14px; line-height: 1.6; color: #0f172a; margin: 0;">
        Configura una nueva contraseña haciendo click en el botón de abajo. El enlace es válido por 1 hora.
      </p>
    </div>
    <p style="margin: 0 0 24px 0;">
      <a href="${params.resetUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Configurar nueva contraseña</a>
    </p>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Si no esperabas este correo, contacta a soporte en soporte@cnvsystem.com.
    </p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${params.recipientName},`,
    ``,
    `Un administrador de CNV Learning solicitó el reseteo de tu contraseña.`,
    ``,
    `Configura una nueva contraseña (el enlace es válido por 1 hora):`,
    params.resetUrl,
    ``,
    `Si no esperabas este correo, contacta a soporte en soporte@cnvsystem.com.`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático.`,
  ].join("\n");

  return { subject, html, text };
}
