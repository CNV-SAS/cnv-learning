export { sendEmail, type SendEmailParams } from "./resend";
export { sendGradingPublishedEmail } from "./grading-notification";
export { sendAnnouncementEmail } from "./announcement-notification";
export {
  sendCertificateIssuedEmail,
  sendCertificateRevokedEmail,
} from "./certificate-notification";
export { sendUserInvitationEmail } from "./user-invitation";
export { sendUserPasswordResetEmail } from "./user-password-reset";
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
export {
  userInvitationTemplate,
  type UserInvitationEmail,
} from "./templates/user-invitation";
export {
  userPasswordResetTemplate,
  type UserPasswordResetEmail,
} from "./templates/user-password-reset";
