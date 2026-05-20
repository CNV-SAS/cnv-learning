// Template puro para el email de invitacion a CNV Learning enviado
// cuando un admin crea un usuario. Funcion idempotente: dado el
// mismo input, mismo {subject, html, text}.
//
// El recipient hace click en el CTA, llega al /auth/confirm que
// hace verifyOtp con el recovery link y redirige a /reset-password
// donde el user setea su password por primera vez.
//
// Subject: "Te invitamos a CNV Learning como {role}".
// Card emerald (consistente con announcement/grading templates).
// Sin assets externos: wordmark text-only inline.

import type { UserRole } from "@/modules/auth/types";

interface UserInvitationParams {
  recipientName: string;
  role: UserRole;
  inviteUrl: string;
}

export interface UserInvitationEmail {
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

function roleLabel(role: UserRole): string {
  if (role === "admin") return "administrador";
  if (role === "teacher") return "docente";
  return "estudiante";
}

export function userInvitationTemplate(
  params: UserInvitationParams,
): UserInvitationEmail {
  const label = roleLabel(params.role);
  const subject = `Te invitamos a CNV Learning como ${label}`;

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
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">Bienvenido a CNV Learning</h1>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #64748b;">
      Hola ${escapeHtml(params.recipientName)}, te creamos una cuenta como ${escapeHtml(label)} en CNV Learning, la plataforma de aprendizaje de Connected Nutrition Ventures.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0 0 12px 0;">PRÓXIMO PASO</p>
      <p style="font-size: 14px; line-height: 1.6; color: #0f172a; margin: 0;">
        Configura tu contraseña para activar tu cuenta. El enlace es válido por 1 hora.
      </p>
    </div>
    <p style="margin: 0 0 24px 0;">
      <a href="${params.inviteUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">Configurar mi contraseña</a>
    </p>
    <p style="font-size: 12px; color: #64748b; margin: 32px 0 0 0;">
      Si no esperabas esta invitación, ignora este correo o contacta a soporte en soporte@cnvsystem.com.
    </p>
  </div>
</body>
</html>`;

  const text = [
    `Hola ${params.recipientName},`,
    ``,
    `Te creamos una cuenta como ${label} en CNV Learning, la plataforma de aprendizaje de Connected Nutrition Ventures.`,
    ``,
    `Configura tu contraseña para activar tu cuenta (el enlace es válido por 1 hora):`,
    params.inviteUrl,
    ``,
    `Si no esperabas esta invitación, ignora este correo o contacta a soporte en soporte@cnvsystem.com.`,
    ``,
    `--`,
    `CNV Learning. Este es un correo automático.`,
  ].join("\n");

  return { subject, html, text };
}
