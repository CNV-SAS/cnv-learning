// Service de navegacion entre lecciones. Calcula vecinos (prev/next)
// dado un lessonId, ordenando globalmente por (module.position,
// lesson.position).
//
// findNeighbors esta exportado como utility pura (testable sin mocks).
// El service orquesta moduleRepository + lessonRepository (1 + N
// queries, N modulos del curso). Acceptable para MVP con 10 modulos;
// si en v2 los cursos crecen a 50+ modulos, optimizar con un join
// custom en lessonRepository.

import { moduleRepository } from "../data/module.repository";
import { lessonRepository } from "../data/lesson.repository";
import type { Lesson } from "../types";

export interface LessonNeighbors {
  prev: Lesson | null;
  next: Lesson | null;
}

// Utility pura. Dada una lista ordenada y un id de elemento actual,
// retorna el anterior y siguiente. Null cuando no encuentra el id o
// cuando el elemento esta en el extremo.
export function findNeighbors<T extends { id: string }>(
  items: T[],
  currentId: string,
): { prev: T | null; next: T | null } {
  const idx = items.findIndex((item) => item.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? items[idx - 1] : null,
    next: idx < items.length - 1 ? items[idx + 1] : null,
  };
}

export const lessonNavigationService = {
  async getNeighbors(
    courseId: string,
    currentLessonId: string,
  ): Promise<LessonNeighbors> {
    const modules = await moduleRepository.listByCourse(courseId);

    // Concatenacion ordenada: modulos ya vienen por position ASC,
    // dentro de cada modulo las lessons tambien por position ASC.
    // Variable nombrada `mod` (no `module`) porque `module` es global
    // de Node CommonJS y ESLint la marca como shadowing.
    const allLessons: Lesson[] = [];
    for (const mod of modules) {
      const lessons = await lessonRepository.listByModule(mod.id);
      allLessons.push(...lessons);
    }

    return findNeighbors(allLessons, currentLessonId);
  },
};
