// High-level helper para enviar el email de anuncio. Combina
// template + cliente Resend. El service de announcements llama
// este helper por cada recipient; ambos (template y send) son
// fault-tolerant.
//
// appUrl resuelve desde NEXT_PUBLIC_APP_URL con fallback al
// dominio canonico de produccion (DEPLOY.md).

import { sendEmail } from "./resend";
import {
  announcementTemplate,
  type AnnouncementEmail,
} from "./templates/announcement";
import type { AnnouncementScope } from "@/modules/announcements/types";

const DEFAULT_APP_URL = "https://lms.cnvsystem.com";

interface SendAnnouncementEmailParams {
  scope: AnnouncementScope;
  recipientEmail: string;
  recipientName: string;
  authorName: string;
  courseTitle?: string;
  title: string;
  body: string;
}

function buildAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
}

export async function sendAnnouncementEmail(
  params: SendAnnouncementEmailParams,
): Promise<void> {
  const { subject, html, text }: AnnouncementEmail = announcementTemplate({
    scope: params.scope,
    recipientName: params.recipientName,
    authorName: params.authorName,
    courseTitle: params.courseTitle,
    title: params.title,
    body: params.body,
    appUrl: buildAppUrl(),
  });

  await sendEmail({
    to: params.recipientEmail,
    subject,
    html,
    text,
  });
}
