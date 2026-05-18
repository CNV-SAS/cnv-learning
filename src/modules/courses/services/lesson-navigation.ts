// Service de navegacion entre lecciones. Calcula vecinos (prev/next)
// dado un lessonId, ordenando globalmente por (module.position,
// lesson.position).
//
// findNeighbors esta exportado como utility pura (testable sin mocks).
// El service orquesta moduleRepository + lessonRepository: primero
// fetch de modulos (1 query) y luego fetch de lessons de cada modulo
// en PARALELO via Promise.all (sub-bloque 4.5-perf). Total: 2
// latencias secuenciales (no 1+N). En v2 con 50+ modulos, considerar
// query embedded (modules con lessons join en 1 sola call).

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

    // Fetch lessons de cada modulo en paralelo (Promise.all sobre
    // map), no en bucle for-await. Modulos vienen por position ASC,
    // dentro de cada modulo las lessons tambien por position ASC,
    // asi que .flat() preserva el orden global correcto.
    //
    // Performance: con N=10 modulos pasa de 10 latencias secuenciales
    // (~2-3s) a 1 latencia (~200-300ms). Critico para navegacion
    // prev/next y router.refresh() del complete button.
    const lessonsByModule = await Promise.all(
      modules.map((mod) => lessonRepository.listByModule(mod.id)),
    );
    const allLessons = lessonsByModule.flat();

    return findNeighbors(allLessons, currentLessonId);
  },
};
