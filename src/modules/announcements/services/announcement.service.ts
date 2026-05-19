// Service: orquestador de emision de anuncios. ARCHITECTURE.md
// regla 2 (action thin -> service; logica de negocio aqui).
//
// Flow (course + global comparten estructura, divergen en
// resolucion de recipients y context de policy):
//   1. Lookup de course (solo scope='course') para policy.
//   2. Resolver context (isTeacherOfCourse para scope='course').
//   3. Policy check (canEmitCourseAnnouncement o canEmitGlobalAnno-
//      uncement).
//   4. Insert announcement (server client, RLS valida author).
//   5. Resolver recipients excluyendo al author (admin client en
//      recipient.repository.ts; ver header de ese archivo).
//   6. Bulk insert N notifications (un solo INSERT VALUES multi-row).
//   7. Send N emails via Resend (Promise.allSettled, fault-tolerant).
//   8. Audit log (regla 8, evento announcement.emitted con metadata).
//
// Si recipients esta vacio (caso edge: curso sin enrolled o el
// author es el unico user de la plataforma) se omiten pasos 6-7
// pero el announcement + audit quedan persistidos.

import {
  announcementRepository,
  recipientRepository,
} from "@/modules/announcements/data";
import {
  canEmitCourseAnnouncement,
  canEmitGlobalAnnouncement,
} from "@/modules/announcements/policies";
import { notificationRepository } from "@/modules/notifications/data";
import { courseRepository } from "@/modules/courses/data";
import { auditRepository } from "@/modules/audit/data";
import { sendAnnouncementEmail } from "@/lib/email";
import { logger } from "@/core/logger/logger";
import {
  type AppError,
  AuthorizationError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type {
  Announcement,
  AnnouncementRecipient,
  AnnouncementScope,
} from "../types";

interface EmitCourseAnnouncementParams {
  user: AuthenticatedUser;
  courseId: string;
  title: string;
  body: string;
}

interface EmitGlobalAnnouncementParams {
  user: AuthenticatedUser;
  title: string;
  body: string;
}

async function deliverToRecipients(params: {
  scope: AnnouncementScope;
  recipients: AnnouncementRecipient[];
  authorName: string;
  courseTitle?: string;
  title: string;
  body: string;
}): Promise<void> {
  if (params.recipients.length === 0) return;

  const notificationKind =
    params.scope === "course" ? "announcement_course" : "announcement_global";

  // 1) Bulk insert de N notifications en un solo statement.
  // Si falla, log error y throw (regla: fallar el flow del
  // announcement preserva integridad: si no llegaron in-app
  // tampoco deberian llegar emails). Sin embargo, las
  // notifications son secundarias al announcement persistido;
  // el caller decide el comportamiento.
  await notificationRepository.createBulk({
    userIds: params.recipients.map((r) => r.userId),
    kind: notificationKind,
    title: params.title,
    body: params.body,
    link: null,
    metadata: { scope: params.scope, ...(params.courseTitle ? { courseTitle: params.courseTitle } : {}) },
  });

  // 2) Emails en paralelo, fault-tolerant. Cada send ya es no-throw
  // en lib/email/resend.ts; Promise.allSettled asegura que un fallo
  // no detenga a los demas.
  await Promise.allSettled(
    params.recipients.map((r) =>
      sendAnnouncementEmail({
        scope: params.scope,
        recipientEmail: r.email,
        recipientName: r.fullName,
        authorName: params.authorName,
        courseTitle: params.courseTitle,
        title: params.title,
        body: params.body,
      }),
    ),
  );
}

export const announcementService = {
  async emitCourseAnnouncement(
    params: EmitCourseAnnouncementParams,
  ): Promise<Result<Announcement, AppError>> {
    const course = await courseRepository.findById(params.courseId);
    if (!course) {
      return err(
        new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
      );
    }

    const isTeacherOfCourse =
      params.user.role === "teacher"
        ? await courseRepository.isTeacherOfCourse(
            params.user.id,
            params.courseId,
          )
        : false;

    const allowed = canEmitCourseAnnouncement(params.user, {
      courseExists: true,
      isTeacherOfCourse,
    });
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_EMIT_ANNOUNCEMENT,
          "No puedes emitir anuncios en este curso.",
        ),
      );
    }

    const announcement = await announcementRepository.create({
      scope: "course",
      course_id: params.courseId,
      author_id: params.user.id,
      title: params.title,
      body: params.body,
    });

    const recipients = await recipientRepository.listCourseRecipients(
      params.courseId,
      params.user.id,
    );

    try {
      await deliverToRecipients({
        scope: "course",
        recipients,
        authorName: params.user.full_name,
        courseTitle: course.title,
        title: params.title,
        body: params.body,
      });
    } catch (e) {
      // Fault-tolerant: announcement queda persistido aunque
      // notifications/emails fallen. El monitoring detecta gaps via
      // el audit que SIEMPRE se registra abajo.
      logger.error("Course announcement delivery partial/total failure", {
        announcementId: announcement.id,
        recipientCount: recipients.length,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    await auditRepository.record({
      event: "announcement.emitted",
      resourceType: "announcement",
      resourceId: announcement.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        scope: "course",
        courseId: params.courseId,
        courseTitle: course.title,
        recipientCount: recipients.length,
        title: params.title,
      },
    });

    return ok(announcement);
  },

  async emitGlobalAnnouncement(
    params: EmitGlobalAnnouncementParams,
  ): Promise<Result<Announcement, AppError>> {
    const allowed = canEmitGlobalAnnouncement(params.user);
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_EMIT_ANNOUNCEMENT,
          "Solo un administrador puede emitir anuncios globales.",
        ),
      );
    }

    const announcement = await announcementRepository.create({
      scope: "global",
      course_id: null,
      author_id: params.user.id,
      title: params.title,
      body: params.body,
    });

    const recipients = await recipientRepository.listGlobalRecipients(
      params.user.id,
    );

    try {
      await deliverToRecipients({
        scope: "global",
        recipients,
        authorName: params.user.full_name,
        title: params.title,
        body: params.body,
      });
    } catch (e) {
      logger.error("Global announcement delivery partial/total failure", {
        announcementId: announcement.id,
        recipientCount: recipients.length,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    await auditRepository.record({
      event: "announcement.emitted",
      resourceType: "announcement",
      resourceId: announcement.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        scope: "global",
        recipientCount: recipients.length,
        title: params.title,
      },
    });

    return ok(announcement);
  },
};
