// Service: inscripcion manual de usuarios a cursos desde el panel
// admin (Bloque 14.6). ARCHITECTURE.md regla 2: logica aqui, no en
// la action.
//
// 2 operaciones:
//   1. enrollUser: si ya existe enrollment cancelado, reactiva (no
//      hace insert duplicado). Si no, crea nuevo. Audit
//      enrollment.created en ambos casos.
//   2. cancelEnrollment: soft delete (is_active=false). Preserva
//      progreso historico. Audit enrollment.cancelled.

import {
  adminEnrollmentRepository,
  adminUserRepository,
} from "@/modules/admin/data";
import { canManageUsers } from "@/modules/admin/policies";
import { courseRepository } from "@/modules/courses/data";
import { auditRepository } from "@/modules/audit/data";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Enrollment } from "@/modules/enrollments/types";

interface EnrollUserParams {
  actor: AuthenticatedUser;
  userId: string;
  courseId: string;
}

interface CancelEnrollmentParams {
  actor: AuthenticatedUser;
  enrollmentId: string;
}

function authzCannotManage(): AuthorizationError {
  return new AuthorizationError(
    ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
    "Solo un administrador puede gestionar inscripciones.",
  );
}

export const adminEnrollmentService = {
  async enrollUser(
    params: EnrollUserParams,
  ): Promise<Result<Enrollment, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(authzCannotManage());
    }

    const targetUser = await adminUserRepository.findProfileById(
      params.userId,
    );
    if (!targetUser) {
      return err(
        new NotFoundError(
          ErrorCodes.USER_NOT_FOUND,
          "Usuario no encontrado.",
        ),
      );
    }

    const course = await courseRepository.findById(params.courseId);
    if (!course) {
      return err(
        new NotFoundError(
          ErrorCodes.COURSE_NOT_FOUND,
          "Curso no encontrado.",
        ),
      );
    }

    // Reuso historico: si ya hay enrollment (activo o cancelado), o
    // reactivamos (cancelado) o reportamos duplicado (activo).
    const existing = await adminEnrollmentRepository.findByUserAndCourse(
      params.userId,
      params.courseId,
    );

    let enrollment: Enrollment;
    let action: "created" | "reactivated";

    if (existing) {
      if (existing.is_active) {
        return err(
          new DomainError(
            ErrorCodes.VALIDATION_FAILED,
            "El usuario ya está inscrito en este curso.",
          ),
        );
      }
      await adminEnrollmentRepository.reactivate(existing.id);
      enrollment = { ...existing, is_active: true };
      action = "reactivated";
    } else {
      enrollment = await adminEnrollmentRepository.create({
        userId: params.userId,
        courseId: params.courseId,
        enrolledBy: params.actor.id,
      });
      action = "created";
    }

    await auditRepository.record({
      event: "enrollment.created",
      resourceType: "enrollment",
      resourceId: enrollment.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        action,
        targetUserId: params.userId,
        targetUserEmail: targetUser.email,
        targetUserFullName: targetUser.full_name,
        courseId: params.courseId,
        courseTitle: course.title,
      },
    });

    return ok(enrollment);
  },

  async cancelEnrollment(
    params: CancelEnrollmentParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(authzCannotManage());
    }

    const enrollment = await adminEnrollmentRepository.findById(
      params.enrollmentId,
    );
    if (!enrollment) {
      return err(
        new NotFoundError(
          ErrorCodes.VALIDATION_FAILED,
          "Inscripción no encontrada.",
        ),
      );
    }

    if (!enrollment.is_active) {
      // Idempotente: ya esta cancelado, no-op + no audit (evita ruido).
      return ok(undefined);
    }

    const targetUser = await adminUserRepository.findProfileById(
      enrollment.user_id,
    );
    const course = await courseRepository.findById(enrollment.course_id);

    await adminEnrollmentRepository.cancel(enrollment.id);

    await auditRepository.record({
      event: "enrollment.cancelled",
      resourceType: "enrollment",
      resourceId: enrollment.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetUserId: enrollment.user_id,
        targetUserEmail: targetUser?.email ?? null,
        targetUserFullName: targetUser?.full_name ?? null,
        courseId: enrollment.course_id,
        courseTitle: course?.title ?? null,
      },
    });

    return ok(undefined);
  },
};
