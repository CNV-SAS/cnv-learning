// Service: orquesta lecturas y mutaciones para el editor de contenidos
// del curso (Bloque 19). Las pages no acceden directo a multiples
// repositorios; el service centraliza policy + audit + side effects
// para mantener actions thin (CLAUDE.md regla 2).
//
// 19.1: listModulesWithCounts (read-only).
// 19.2: CRUD modulos + reorder con swap atomico via RPC.
//   - Permisos via canEditCourseContent (admin OR teacher asignado).
//   - Borrado blocking estricto si el modulo tiene dependencias
//     (lessons, assignments, submissions, gradings). Mensaje
//     contextual enumera los counts; soft delete se difiere al
//     Bloque 22.
//   - Audit log course_module.deleted con snapshot completo del
//     modulo en metadata.
//   - Reorder swap via RPC swap_module_positions (migracion 0027)
//     para evitar conflicto del unique (course_id, position) durante
//     el intercambio.

import {
  courseRepository,
  moduleRepository,
  lessonRepository,
} from "@/modules/courses/data";
import { assignmentRepository } from "@/modules/assignments/data";
import { submissionRepository } from "@/modules/assignments/data";
import { gradingRepository } from "@/modules/assignments/data";
import { canEditCourseContent } from "@/modules/courses/policies";
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
import type { Module } from "@/modules/courses/types";

export interface ModuleDeleteImpact {
  lessonCount: number;
  assignmentCount: number;
  submissionCount: number;
  gradingCount: number;
}

export interface ModuleWithImpact {
  module: Module;
  impact: ModuleDeleteImpact;
}

// Resuelve el context comun de canEditCourseContent + existencia del
// course. Centralizado para no duplicar la query en cada metodo.
async function authorizeCourseEdit(
  user: AuthenticatedUser,
  courseId: string,
): Promise<Result<{ courseId: string }, AppError>> {
  const [course, isTeacherOfCourse] = await Promise.all([
    courseRepository.findById(courseId),
    user.role === "teacher"
      ? courseRepository.isTeacherOfCourse(user.id, courseId)
      : Promise.resolve(false),
  ]);
  if (!course) {
    return err(
      new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
    );
  }
  const allowed = canEditCourseContent(user, {
    courseExists: true,
    isTeacherOfCourse,
  });
  if (!allowed) {
    return err(
      new AuthorizationError(
        ErrorCodes.AUTHZ_CANNOT_EDIT_COURSE_CONTENT,
        "No puedes editar el contenido de este curso.",
      ),
    );
  }
  return ok({ courseId });
}

// Suma de weights del curso EXCLUYENDO el modulo dado (util para
// validar create/update sin contar el modulo que estamos editando).
async function sumWeightsExcept(
  courseId: string,
  excludeModuleId: string | null,
): Promise<number> {
  const modules = await moduleRepository.listByCourse(courseId);
  return modules
    .filter((m) => m.id !== excludeModuleId)
    .reduce((acc, m) => acc + Number(m.weight ?? 0), 0);
}

export const courseContentEditorService = {
  // Lista los modulos del curso con impact pre-calculado (lesson +
  // assignment + submission + grading counts). El page del editor
  // usa los counts para el display Y los pasa al delete dialog
  // (Bloque 19.2) para que ambos compartan la misma fuente sin
  // re-query. N+1 controlado: 10 modulos max * 4 queries paralelas.
  async listModulesWithImpact(courseId: string): Promise<ModuleWithImpact[]> {
    const modules = await moduleRepository.listByCourse(courseId);

    const entries = await Promise.all(
      modules.map(async (module) => {
        const [lessons, assignments] = await Promise.all([
          lessonRepository.listByModule(module.id),
          assignmentRepository.listByModule(module.id),
        ]);
        const assignmentIds = assignments.map((a) => a.id);
        const submissions =
          assignmentIds.length > 0
            ? await submissionRepository.listByAssignmentIds(assignmentIds)
            : [];
        const submissionIds = submissions.map((s) => s.id);
        const gradings =
          submissionIds.length > 0
            ? await gradingRepository.listBySubmissionIds(submissionIds)
            : [];
        return {
          module,
          impact: {
            lessonCount: lessons.length,
            assignmentCount: assignments.length,
            submissionCount: submissions.length,
            gradingCount: gradings.length,
          },
        };
      }),
    );

    return entries;
  },

  async createModule(params: {
    user: AuthenticatedUser;
    courseId: string;
    title: string;
    description: string | null;
    weight: number;
  }): Promise<Result<Module, AppError>> {
    const auth = await authorizeCourseEdit(params.user, params.courseId);
    if (!auth.ok) return err(auth.error);

    // Validar suma de weights <= 100 (al crear no se excluye nada).
    const existingSum = await sumWeightsExcept(params.courseId, null);
    if (existingSum + params.weight > 100) {
      return err(
        new DomainError(
          ErrorCodes.MODULE_WEIGHT_SUM_EXCEEDED,
          `La suma de pesos excederia 100 (actual ${existingSum}, nuevo +${params.weight}).`,
        ),
      );
    }

    const max = await moduleRepository.maxPosition(params.courseId);
    const nextPosition = (max ?? 0) + 1;

    const module = await moduleRepository.create({
      course_id: params.courseId,
      title: params.title,
      description: params.description,
      weight: params.weight,
      position: nextPosition,
    });

    return ok(module);
  },

  async updateModule(params: {
    user: AuthenticatedUser;
    moduleId: string;
    title: string;
    description: string | null;
    weight: number;
  }): Promise<Result<Module, AppError>> {
    const module = await moduleRepository.findById(params.moduleId);
    if (!module) {
      return err(
        new NotFoundError(
          ErrorCodes.MODULE_NOT_FOUND,
          "Módulo no encontrado.",
        ),
      );
    }

    const auth = await authorizeCourseEdit(params.user, module.course_id);
    if (!auth.ok) return err(auth.error);

    const existingSum = await sumWeightsExcept(
      module.course_id,
      params.moduleId,
    );
    if (existingSum + params.weight > 100) {
      return err(
        new DomainError(
          ErrorCodes.MODULE_WEIGHT_SUM_EXCEEDED,
          `La suma de pesos excederia 100 (resto ${existingSum}, este +${params.weight}).`,
        ),
      );
    }

    const updated = await moduleRepository.update(params.moduleId, {
      title: params.title,
      description: params.description,
      weight: params.weight,
    });

    return ok(updated);
  },

  // Pre-computa el impacto del delete (cuantas entidades dependientes
  // se cascadearian). UI lo usa para mostrar el mensaje contextual
  // sin tener que llamar delete y leer el error.
  async getModuleDeleteImpact(
    params: { user: AuthenticatedUser; moduleId: string },
  ): Promise<Result<ModuleDeleteImpact, AppError>> {
    const module = await moduleRepository.findById(params.moduleId);
    if (!module) {
      return err(
        new NotFoundError(
          ErrorCodes.MODULE_NOT_FOUND,
          "Módulo no encontrado.",
        ),
      );
    }

    const auth = await authorizeCourseEdit(params.user, module.course_id);
    if (!auth.ok) return err(auth.error);

    const [lessons, assignments] = await Promise.all([
      lessonRepository.listByModule(params.moduleId),
      assignmentRepository.listByModule(params.moduleId),
    ]);
    const assignmentIds = assignments.map((a) => a.id);
    const submissions =
      assignmentIds.length > 0
        ? await submissionRepository.listByAssignmentIds(assignmentIds)
        : [];
    const submissionIds = submissions.map((s) => s.id);
    const gradings =
      submissionIds.length > 0
        ? await gradingRepository.listBySubmissionIds(submissionIds)
        : [];

    return ok({
      lessonCount: lessons.length,
      assignmentCount: assignments.length,
      submissionCount: submissions.length,
      gradingCount: gradings.length,
    });
  },

  async deleteModule(params: {
    user: AuthenticatedUser;
    moduleId: string;
  }): Promise<Result<ModuleDeleteImpact | null, AppError>> {
    const module = await moduleRepository.findById(params.moduleId);
    if (!module) {
      return err(
        new NotFoundError(
          ErrorCodes.MODULE_NOT_FOUND,
          "Módulo no encontrado.",
        ),
      );
    }

    const auth = await authorizeCourseEdit(params.user, module.course_id);
    if (!auth.ok) return err(auth.error);

    // Blocking estricto: cualquier dependencia abre el escudo.
    const impactResult = await this.getModuleDeleteImpact({
      user: params.user,
      moduleId: params.moduleId,
    });
    if (!impactResult.ok) return err(impactResult.error);
    const impact = impactResult.value;
    const hasDeps =
      impact.lessonCount > 0 ||
      impact.assignmentCount > 0 ||
      impact.submissionCount > 0 ||
      impact.gradingCount > 0;
    if (hasDeps) {
      return err(
        new DomainError(
          ErrorCodes.MODULE_HAS_DEPENDENCIES,
          // Mensaje no se muestra al user (la UI ya tiene el impact
          // detallado); este es para logs/audit.
          `El módulo tiene dependencias: ${impact.lessonCount} lecciones, ${impact.assignmentCount} tareas, ${impact.submissionCount} entregas, ${impact.gradingCount} calificaciones.`,
        ),
      );
    }

    // Snapshot ANTES del delete (regla 8 + memo de audit ANTES de
    // mutaciones destructivas) para preservar forensics.
    await auditRepository.record({
      event: "course_module.deleted",
      resourceType: "module",
      resourceId: module.id,
      actorId: params.user.id,
      actorEmail: params.user.email,
      metadata: {
        snapshot: {
          id: module.id,
          course_id: module.course_id,
          title: module.title,
          description: module.description,
          position: module.position,
          weight: module.weight,
          created_at: module.created_at,
          updated_at: module.updated_at,
        },
      },
    });

    await moduleRepository.delete(params.moduleId);

    return ok(null);
  },

  async reorderModule(params: {
    user: AuthenticatedUser;
    moduleId: string;
    direction: "up" | "down";
  }): Promise<Result<void, AppError>> {
    const module = await moduleRepository.findById(params.moduleId);
    if (!module) {
      return err(
        new NotFoundError(
          ErrorCodes.MODULE_NOT_FOUND,
          "Módulo no encontrado.",
        ),
      );
    }

    const auth = await authorizeCourseEdit(params.user, module.course_id);
    if (!auth.ok) return err(auth.error);

    const all = await moduleRepository.listByCourse(module.course_id);
    const idx = all.findIndex((m) => m.id === params.moduleId);
    const neighborIdx = params.direction === "up" ? idx - 1 : idx + 1;
    const neighbor = all[neighborIdx];

    if (!neighbor) {
      return err(
        new DomainError(
          ErrorCodes.MODULE_REORDER_NO_NEIGHBOR,
          params.direction === "up"
            ? "El módulo ya está en la primera posición."
            : "El módulo ya está en la última posición.",
        ),
      );
    }

    await moduleRepository.swapPositions(
      module.course_id,
      module.position,
      neighbor.position,
    );

    return ok(undefined);
  },
};
