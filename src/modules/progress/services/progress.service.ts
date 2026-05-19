// Service de progress. Bloque 4 sub-bloque 4.5 lo creo con
// markLessonCompleted thin; Bloque 5 sub-bloque 5.1 lo extiende
// con cálculos para dashboard y course view; Bloque 12 sub-bloque
// 12.6 agrega la emision automatica del certificado al cruzar
// 100% (orquestacion inline, no event bus).
//
// API publica del service:
//   - markLessonCompleted(userId, lessonId): persiste + side
//     effects (emit cert si llega a 100%).
//   - getCourseSummary(userId, courseId): {progress, badge,
//     continueLesson} para el dashboard. 2 queries netas (modulos
//     y lessons del curso paralelo + completed del user paralelo).
//   - getModulesWithProgress(userId, courseId): array de
//     {module, lessons, progress} para el course view. Reusa los
//     mismos fetches que getCourseSummary; evita N+1 sobre
//     getModuleProgress(moduleId) por cada modulo.
//
// La decision de mantener orquestacion inline (vs event bus en
// core/events/) es del Bloque 12: el bus in-memory no es durable
// y ARCHITECTURE.md recomienda inline para flujos criticos como
// emision de certificado. Si v1.1 introduce multiples handlers
// reactivos al mismo evento, implementamos el bus entonces.

import { moduleRepository } from "@/modules/courses/data/module.repository";
import { lessonRepository } from "@/modules/courses/data/lesson.repository";
import type { Lesson, Module } from "@/modules/courses/types";
import { certificateService } from "@/modules/certificates/services";
import { logger } from "@/core/logger/logger";
import { lessonProgressRepository } from "../data/lesson-progress.repository";
import {
  calculateProgress,
  getBadge,
  pickFirstUncompleted,
  type Badge,
  type ProgressSummary,
} from "../lib";

export interface CourseSummary {
  progress: ProgressSummary;
  badge: Badge;
  continueLesson: Lesson | null;
}

export interface ModuleWithProgress {
  module: Module;
  lessons: Lesson[];
  progress: ProgressSummary;
}

export const progressService = {
  async markLessonCompleted(
    userId: string,
    lessonId: string,
  ): Promise<void> {
    await lessonProgressRepository.markCompleted(userId, lessonId);

    // Emision automatica del certificado si el curso llega a 100%
    // por primera vez (Bloque 12.6). Fault-tolerant per consideracion
    // C del plan: si la emision falla por cualquier razon, log warn
    // pero NO bloquea el markLessonCompleted. El estudiante ya
    // completo la leccion; el cert se puede emitir manualmente o
    // reintentar.
    try {
      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson) return;
      const moduleRow = await moduleRepository.findById(lesson.module_id);
      if (!moduleRow) return;

      const summary = await this.getCourseSummary(
        userId,
        moduleRow.course_id,
      );
      if (summary.progress.percentage !== 100) return;

      const result = await certificateService.issueCertificate({
        userId,
        courseId: moduleRow.course_id,
        isCourseComplete: true,
      });
      if (!result.ok) {
        // Outcomes esperables: CERTIFICATE_ALREADY_ISSUED (race con
        // otra leccion marcada concurrente; idempotent OK) o
        // INFRA_ERROR (BD caida; reintenta manualmente). En ambos
        // casos log + return; no se propaga al markLessonCompleted.
        logger.warn("Certificate emission did not succeed (non-blocking)", {
          userId,
          courseId: moduleRow.course_id,
          errorCode: result.error.code,
          errorMessage: result.error.message,
        });
      }
    } catch (e) {
      logger.warn(
        "Certificate emission flow threw unexpected (non-blocking)",
        {
          userId,
          lessonId,
          error: e instanceof Error ? e.message : String(e),
        },
      );
    }
  },

  async getCourseSummary(
    userId: string,
    courseId: string,
  ): Promise<CourseSummary> {
    const modules = await moduleRepository.listByCourse(courseId);

    // Fetch lessons de cada modulo en paralelo + completed del user
    // en paralelo. lessons.flat() preserva orden global por position
    // (mismo patron del lessonNavigationService de Bloque 4).
    const [lessonsByModule, completedIds] = await Promise.all([
      Promise.all(modules.map((mod) => lessonRepository.listByModule(mod.id))),
      lessonProgressRepository.listCompletedLessonIdsForUserAndCourse(
        userId,
        courseId,
      ),
    ]);

    const allLessons = lessonsByModule.flat();
    const progress = calculateProgress(completedIds.length, allLessons.length);
    const badge = getBadge(progress.percentage);
    const continueLesson = pickFirstUncompleted(
      allLessons,
      new Set(completedIds),
    );

    return { progress, badge, continueLesson };
  },

  async getModulesWithProgress(
    userId: string,
    courseId: string,
  ): Promise<ModuleWithProgress[]> {
    const modules = await moduleRepository.listByCourse(courseId);

    const [lessonsByModule, completedIds] = await Promise.all([
      Promise.all(modules.map((mod) => lessonRepository.listByModule(mod.id))),
      lessonProgressRepository.listCompletedLessonIdsForUserAndCourse(
        userId,
        courseId,
      ),
    ]);

    const completedSet = new Set(completedIds);

    return modules.map((mod, idx) => {
      const lessons = lessonsByModule[idx];
      const completedCount = lessons.filter((l) =>
        completedSet.has(l.id),
      ).length;
      return {
        module: mod,
        lessons,
        progress: calculateProgress(completedCount, lessons.length),
      };
    });
  },
};
