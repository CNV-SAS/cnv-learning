// Helper para enviar el email de invitacion a un usuario recien
// creado por un admin. Combina template + cliente Resend. Ambos
// fault-tolerant.

import { sendEmail } from "./resend";
import { userInvitationTemplate } from "./templates/user-invitation";
import type { UserRole } from "@/modules/auth/types";

interface SendUserInvitationEmailParams {
  recipientEmail: string;
  recipientName: string;
  role: UserRole;
  inviteUrl: string;
}

export async function sendUserInvitationEmail(
  params: SendUserInvitationEmailParams,
): Promise<void> {
  const { subject, html, text } = userInvitationTemplate({
    recipientName: params.recipientName,
    role: params.role,
    inviteUrl: params.inviteUrl,
  });

  await sendEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}
