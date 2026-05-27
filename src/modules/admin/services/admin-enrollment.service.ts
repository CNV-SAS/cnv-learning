// Service: gestion de cursos asignados a un usuario desde el panel
// admin (Bloque 14.6 + fix 14.11). ARCHITECTURE.md regla 2: logica
// aqui, no en la action.
//
// Discrimina por rol del target (BUG 2 del smoke 14):
//   - student -> enrollments table (soft delete via is_active).
//   - teacher -> course_teachers table (hard delete, PK compuesto).
//   - admin   -> sin asignacion (acceso global via RLS).
//
// 4 operaciones:
//   1. enrollUser (student): si ya existe enrollment cancelado,
//      reactiva. Si no, crea nuevo. Audit enrollment.created.
//   2. cancelEnrollment (student): soft delete (is_active=false).
//      Preserva progreso. Audit enrollment.cancelled.
//   3. assignTeacherToCourse: INSERT en course_teachers.
//      Audit course_teacher.assigned.
//   4. removeTeacherFromCourse: DELETE de course_teachers. El
//      teacher pierde acceso de docente al curso. Audit
//      course_teacher.removed.

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

interface AssignTeacherToCourseParams {
  actor: AuthenticatedUser;
  teacherUserId: string;
  courseId: string;
}

interface RemoveTeacherFromCourseParams {
  actor: AuthenticatedUser;
  teacherUserId: string;
  courseId: string;
}

interface UpdateTeacherCanManageCourseParams {
  actor: AuthenticatedUser;
  teacherUserId: string;
  courseId: string;
  canManageCourse: boolean;
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

  async assignTeacherToCourse(
    params: AssignTeacherToCourseParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(authzCannotManage());
    }

    const targetUser = await adminUserRepository.findProfileById(
      params.teacherUserId,
    );
    if (!targetUser) {
      return err(
        new NotFoundError(
          ErrorCodes.USER_NOT_FOUND,
          "Usuario no encontrado.",
        ),
      );
    }
    if (targetUser.role !== "teacher") {
      return err(
        new DomainError(
          ErrorCodes.VALIDATION_FAILED,
          "Solo usuarios con rol docente pueden ser asignados a cursos como docentes.",
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

    const alreadyAssigned =
      await adminEnrollmentRepository.isTeacherAssignedToCourse({
        teacherId: params.teacherUserId,
        courseId: params.courseId,
      });
    if (alreadyAssigned) {
      return err(
        new DomainError(
          ErrorCodes.VALIDATION_FAILED,
          "El docente ya está asignado a este curso.",
        ),
      );
    }

    await adminEnrollmentRepository.assignTeacherToCourse({
      teacherId: params.teacherUserId,
      courseId: params.courseId,
    });

    await auditRepository.record({
      event: "course_teacher.assigned",
      resourceType: "course_teacher",
      // course_teachers no tiene id propio; resourceId compuesto
      // para que audit search por resource pueda inferir el par.
      resourceId: `${params.courseId}:${params.teacherUserId}`,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        teacherUserId: params.teacherUserId,
        teacherEmail: targetUser.email,
        teacherFullName: targetUser.full_name,
        courseId: params.courseId,
        courseTitle: course.title,
      },
    });

    return ok(undefined);
  },

  async removeTeacherFromCourse(
    params: RemoveTeacherFromCourseParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(authzCannotManage());
    }

    const targetUser = await adminUserRepository.findProfileById(
      params.teacherUserId,
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

    const isAssigned =
      await adminEnrollmentRepository.isTeacherAssignedToCourse({
        teacherId: params.teacherUserId,
        courseId: params.courseId,
      });
    if (!isAssigned) {
      // Idempotente: no estaba asignado, no-op + no audit.
      return ok(undefined);
    }

    await adminEnrollmentRepository.removeTeacherFromCourse({
      teacherId: params.teacherUserId,
      courseId: params.courseId,
    });

    await auditRepository.record({
      event: "course_teacher.removed",
      resourceType: "course_teacher",
      resourceId: `${params.courseId}:${params.teacherUserId}`,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        teacherUserId: params.teacherUserId,
        teacherEmail: targetUser.email,
        teacherFullName: targetUser.full_name,
        courseId: params.courseId,
        courseTitle: course.title,
      },
    });

    return ok(undefined);
  },

  // Bloque 23.1.c. Setea el flag can_manage_course del teacher
  // sobre un curso especifico. Pre-condicion: el teacher debe estar
  // asignado al curso (no se hace via esta operacion el assign + flag
  // en un solo paso; el admin primero asigna, luego flip el flag).
  //
  // Audit course_teacher.permissions_updated con previous/next flag.
  // Idempotente: si el flag ya estaba en el valor target, no-op + no
  // audit (mismo patron que updateRole / updateName).
  async updateTeacherCanManageCourse(
    params: UpdateTeacherCanManageCourseParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(authzCannotManage());
    }

    const targetUser = await adminUserRepository.findProfileById(
      params.teacherUserId,
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

    const current = await adminEnrollmentRepository.getTeacherCoursePermissions(
      {
        teacherId: params.teacherUserId,
        courseId: params.courseId,
      },
    );
    if (!current) {
      return err(
        new DomainError(
          ErrorCodes.VALIDATION_FAILED,
          "El docente no está asignado a este curso.",
        ),
      );
    }

    if (current.canManageCourse === params.canManageCourse) {
      // Idempotencia: ya esta seteado, no-op + no audit.
      return ok(undefined);
    }

    await adminEnrollmentRepository.updateTeacherCoursePermissions({
      teacherId: params.teacherUserId,
      courseId: params.courseId,
      canManageCourse: params.canManageCourse,
    });

    await auditRepository.record({
      event: "course_teacher.permissions_updated",
      resourceType: "course_teacher",
      resourceId: `${params.courseId}:${params.teacherUserId}`,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        teacherUserId: params.teacherUserId,
        teacherEmail: targetUser.email,
        teacherFullName: targetUser.full_name,
        courseId: params.courseId,
        courseTitle: course.title,
        previousCanManageCourse: current.canManageCourse,
        newCanManageCourse: params.canManageCourse,
      },
    });

    return ok(undefined);
  },
};
