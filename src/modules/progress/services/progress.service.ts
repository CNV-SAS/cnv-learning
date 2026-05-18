// Service de progress. Hoy thin (Bloque 4 sub-bloque 4.5: solo
// persiste lesson_progress). Bloque 5 lo extiende con:
//   - Recalcular % de progreso del modulo y del curso.
//   - Verificar si el modulo/curso esta completo -> emit
//     "module.completed" o "course.completed".
//   - Actualizar la insignia visible (Junior/Senior/Master).
//
// El anchor del service hoy evita refactorear el call site (la
// action) cuando entren esos efectos.
//
// ARCHITECTURE.md regla 2: server actions thin llaman services; la
// logica de dominio vive aqui.

import { lessonProgressRepository } from "../data/lesson-progress.repository";

export const progressService = {
  async markLessonCompleted(
    userId: string,
    lessonId: string,
  ): Promise<void> {
    await lessonProgressRepository.markCompleted(userId, lessonId);
    // En Bloque 5: emit "lesson.completed" + recalc progreso + check
    // insignia + posible emit "course.completed" si llega a 100%.
  },
};
