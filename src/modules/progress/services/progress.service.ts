// Service de progress. Bloque 4 sub-bloque 4.5 lo creo con
// markLessonCompleted thin; Bloque 5 sub-bloque 5.1 lo extiende
// con cálculos para dashboard y course view.
//
// API publica del service:
//   - markLessonCompleted(userId, lessonId): persiste (heredado).
//   - getCourseSummary(userId, courseId): {progress, badge,
//     continueLesson} para el dashboard. 2 queries netas (modulos
//     y lessons del curso paralelo + completed del user paralelo).
//   - getModulesWithProgress(userId, courseId): array de
//     {module, lessons, progress} para el course view. Reusa los
//     mismos fetches que getCourseSummary; evita N+1 sobre
//     getModuleProgress(moduleId) por cada modulo.
//
// Bloque 5 sub-bloque siguiente agregaria emit "lesson.completed"
// + "course.completed" en markLessonCompleted cuando exista el
// event bus en Bloque 10/11. Por ahora el comment anchor sigue.

import { moduleRepository } from "@/modules/courses/data/module.repository";
import { lessonRepository } from "@/modules/courses/data/lesson.repository";
import type { Lesson, Module } from "@/modules/courses/types";
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
    // Pendiente Bloque 10/11: emit "lesson.completed" + posible
    // emit "course.completed" si llega a 100%.
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
