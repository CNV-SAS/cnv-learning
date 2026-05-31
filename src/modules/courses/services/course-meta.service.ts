// Service: orquesta create/update de metadatos del curso (Bloque
// 23.1). Mismo patron que courseContentEditorService: actions thin
// delegan aqui para policy + audit + idempotencia.
//
// 2 operaciones:
//   1. createCourse: admin-only (canCreateCourse) + check slug
//      unique + insert + audit course.created.
//   2. updateCourse: admin OR teacher con flag (canEditCourseMeta)
//      + check slug unique excluyendo el courseId + update + audit
//      course.meta_updated con snapshot de changes.
//
// Las RLS de courses (admin manage + teacher manage with flag,
// migraciones 0017 + 0032) cubren defense-in-depth en el SQL
// boundary.

import { courseRepository } from "@/modules/courses/data";
import {
  canCreateCourse,
  canDeleteCourse,
  canEditCourseMeta,
} from "@/modules/courses/policies";
import { auditRepository } from "@/modules/audit/data";
import { courseStorageCleanupService } from "./course-storage-cleanup.service";
import { logger } from "@/core/logger/logger";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Course } from "@/modules/courses/types";

interface CreateCourseParams {
  actor: AuthenticatedUser;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  passingGrade: number;
}

interface UpdateCourseParams {
  actor: AuthenticatedUser;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  // Smoke E2E post-ISSUE-3 decision: passing_grade es INMUTABLE
  // despues del create. El service NO acepta este param para que el
  // contrato sea explicito a nivel de tipos. Ver update-course.ts +
  // update-course.action.ts para la decision completa.
}

interface DeleteCourseParams {
  actor: AuthenticatedUser;
  courseId: string;
  confirmTitle: string;
}

export const courseMetaService = {
  async createCourse(
    params: CreateCourseParams,
  ): Promise<Result<{ courseId: string }, AppError>> {
    if (!canCreateCourse(params.actor)) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_CREATE_COURSE,
          "Solo un administrador puede crear cursos.",
        ),
      );
    }

    // Pre-check de slug para devolver error de dominio claro en lugar
    // del unique-violation generico de Postgres.
    const taken = await courseRepository.slugExists(params.slug);
    if (taken) {
      return err(
        new DomainError(
          ErrorCodes.COURSE_SLUG_TAKEN,
          "Ya existe un curso con ese slug. Elige otro.",
        ),
      );
    }

    const course = await courseRepository.create({
      title: params.title,
      slug: params.slug,
      description: params.description,
      cover_url: params.coverUrl,
      passing_grade: params.passingGrade,
    });

    await auditRepository.record({
      event: "course.created",
      resourceType: "course",
      resourceId: course.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        title: course.title,
        slug: course.slug,
        isPublished: course.is_published,
      },
    });

    return ok({ courseId: course.id });
  },

  async updateCourse(
    params: UpdateCourseParams,
  ): Promise<Result<Course, AppError>> {
    const course = await courseRepository.findById(params.courseId);
    if (!course) {
      return err(
        new NotFoundError(
          ErrorCodes.COURSE_NOT_FOUND,
          "Curso no encontrado.",
        ),
      );
    }

    // Resolver el context de canEditCourseMeta. Para admin saltamos
    // las queries a course_teachers porque la policy admin = true
    // independientemente del flag.
    const [isTeacherOfCourse, canManageCourse] =
      params.actor.role === "teacher"
        ? await Promise.all([
            courseRepository.isTeacherOfCourse(
              params.actor.id,
              params.courseId,
            ),
            courseRepository.getCourseTeacherFlag(
              params.actor.id,
              params.courseId,
            ),
          ])
        : [false, false];

    const allowed = canEditCourseMeta(params.actor, {
      courseExists: true,
      isTeacherOfCourse,
      canManageCourse,
    });
    if (!allowed) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_EDIT_COURSE_META,
          "No puedes editar este curso.",
        ),
      );
    }

    // Slug unique check excluyendo el propio courseId (un curso puede
    // mantener su slug en updates de otros campos).
    if (params.slug !== course.slug) {
      const taken = await courseRepository.slugExists(
        params.slug,
        params.courseId,
      );
      if (taken) {
        return err(
          new DomainError(
            ErrorCodes.COURSE_SLUG_TAKEN,
            "Ya existe un curso con ese slug. Elige otro.",
          ),
        );
      }
    }

    const updated = await courseRepository.update(params.courseId, {
      title: params.title,
      slug: params.slug,
      description: params.description,
      cover_url: params.coverUrl,
      is_published: params.isPublished,
      // passing_grade NO se updatea: smoke E2E post-ISSUE-3 decision.
      // Preservamos el valor actual del course para que el progreso
      // ya calculado de alumnos enrolled siga coherente.
      passing_grade: Number(course.passing_grade),
    });

    // Snapshot de cambios para audit. Solo registramos los campos que
    // efectivamente cambiaron para que la metadata no sea ruidosa.
    const changes: Record<string, { previous: unknown; next: unknown }> = {};
    if (course.title !== updated.title) {
      changes.title = { previous: course.title, next: updated.title };
    }
    if (course.slug !== updated.slug) {
      changes.slug = { previous: course.slug, next: updated.slug };
    }
    if (course.description !== updated.description) {
      changes.description = {
        previous: course.description,
        next: updated.description,
      };
    }
    if (course.cover_url !== updated.cover_url) {
      changes.cover_url = {
        previous: course.cover_url,
        next: updated.cover_url,
      };
    }
    if (course.is_published !== updated.is_published) {
      changes.is_published = {
        previous: course.is_published,
        next: updated.is_published,
      };
    }
    // passing_grade ya no se updatea (inmutable post-create); el diff
    // entre course y updated queda en 0 por construccion.

    // Si no cambio nada, no auditamos (idempotencia).
    if (Object.keys(changes).length > 0) {
      await auditRepository.record({
        event: "course.meta_updated",
        resourceType: "course",
        resourceId: updated.id,
        actorId: params.actor.id,
        actorEmail: params.actor.email,
        metadata: {
          actorRole: params.actor.role,
          changes,
        },
      });
    }

    return ok(updated);
  },

  // Hard delete del curso (Bloque 23 smoke #2 + round 3 storage
  // cleanup). Solo admin.
  //
  // Flow:
  //   1. canDeleteCourse policy (admin only).
  //   2. Lookup pre-delete: 404 si no existe.
  //   3. Confirmacion textual: confirmTitle (trimmed) === course.title.
  //   4. Count enrollments activos.
  //   5. Smoke E2E round 3 Diagnostico B: collectCourseStoragePaths +
  //      deleteCourseStorage ANTES del CASCADE. Best-effort: si falla
  //      un bucket el resto sigue (Promise.allSettled). El resultado
  //      se persiste en audit metadata para forensics.
  //   6. Audit ANTES del DB delete con snapshot completo + counts de
  //      storage cleanup (los detalles textuales se pierden con el
  //      CASCADE, audit log es la unica traza recuperable).
  //   7. courseRepository.delete() -> CASCADE limpia modules, lessons,
  //      attachments, assignments, quiz_questions, quiz_options,
  //      submissions, gradings, ai_grading_suggestions, enrollments,
  //      forums, forum_threads, forum_replies, announcements,
  //      certificates, academic_certificates, course_events,
  //      course_resources, course_teachers.
  //
  // Caveat: ai_grading_suggestions y gradings tienen FK NO ACTION
  // entre si (gradings.ai_suggestion_id). El CASCADE de submissions
  // resuelve el orden topologico automaticamente. Si smoke detecta
  // error, agregar delete topologico explicito antes del repository
  // call.
  async deleteCourse(
    params: DeleteCourseParams,
  ): Promise<Result<void, AppError>> {
    if (!canDeleteCourse(params.actor)) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_DELETE_COURSE,
          "Solo un administrador puede eliminar cursos.",
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

    if (params.confirmTitle.trim() !== course.title) {
      return err(
        new DomainError(
          ErrorCodes.COURSE_DELETE_CONFIRMATION_MISMATCH,
          "El título de confirmación no coincide con el del curso.",
        ),
      );
    }

    const activeEnrollmentCount =
      await courseRepository.countActiveEnrollments(params.courseId);

    // Storage cleanup ANTES del CASCADE (Diagnostico B). Fault-
    // tolerant: si la coleccion o el delete fallan, igual seguimos
    // al DB delete (best-effort: huerfanos > delete bloqueado).
    let storageCleanup: Awaited<
      ReturnType<typeof courseStorageCleanupService.deleteCourseStorage>
    > | null = null;
    let storagePathCount = 0;
    try {
      const paths =
        await courseStorageCleanupService.collectCourseStoragePaths(
          params.courseId,
        );
      storagePathCount =
        paths.courseResources.length +
        paths.submissions.length +
        paths.academicCertificates.length;
      if (storagePathCount > 0) {
        storageCleanup =
          await courseStorageCleanupService.deleteCourseStorage(paths);
      }
    } catch (e) {
      logger.warn(
        "Course storage cleanup threw (non-blocking, continuing with DB delete)",
        {
          courseId: params.courseId,
          error: e instanceof Error ? e.message : String(e),
        },
      );
    }

    await auditRepository.record({
      event: "course.deleted",
      resourceType: "course",
      resourceId: course.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        title: course.title,
        slug: course.slug,
        description: course.description,
        coverUrl: course.cover_url,
        isPublished: course.is_published,
        startsAt: course.starts_at,
        endsAt: course.ends_at,
        activeEnrollmentCount,
        storageCleanup: storageCleanup ?? {
          deleted: {
            courseResources: 0,
            submissions: 0,
            academicCertificates: 0,
          },
          failed: {
            courseResources: 0,
            submissions: 0,
            academicCertificates: 0,
          },
        },
        storagePathCount,
      },
    });

    await courseRepository.delete(params.courseId);
    return ok(undefined);
  },
};
