// Helper para enviar el email de reset de contrasena forzado por
// admin. A diferencia del forgot-password publico (self-service),
// este lo dispara el admin desde /admin/users/[id]. Combina
// template + cliente Resend. Ambos fault-tolerant.

import { sendEmail } from "./resend";
import { userPasswordResetTemplate } from "./templates/user-password-reset";

interface SendUserPasswordResetEmailParams {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
}

export async function sendUserPasswordResetEmail(
  params: SendUserPasswordResetEmailParams,
): Promise<void> {
  const { subject, html, text } = userPasswordResetTemplate({
    recipientName: params.recipientName,
    resetUrl: params.resetUrl,
  });

  await sendEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}
