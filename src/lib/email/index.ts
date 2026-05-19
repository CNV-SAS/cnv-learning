export { sendEmail, type SendEmailParams } from "./resend";
export { sendGradingPublishedEmail } from "./grading-notification";
export { sendAnnouncementEmail } from "./announcement-notification";
export {
  sendCertificateIssuedEmail,
  sendCertificateRevokedEmail,
} from "./certificate-notification";
export {
  gradingPublishedTemplate,
  type GradingPublishedEmail,
} from "./templates/grading-published";
export {
  announcementTemplate,
  type AnnouncementEmail,
} from "./templates/announcement";
export {
  certificateNotificationTemplate,
  type CertificateNotificationEmail,
  type CertificateEmailKind,
} from "./templates/certificate-notification";
