// Helper compartido para construir el label del ProgressBar (Bloque
// post-23, decision Q2 del analisis). Muestra "X de Y lecciones" con
// "(M tareas pendientes)" condicional si hay tareas obligatorias
// faltantes.
//
// Para curso sin tareas obligatorias el label queda como en MVP
// original ("X de Y lecciones") sin sufijo. Para curso con tareas
// pendientes el alumno entiende por que el % no llega a 100 aunque
// haya completado las lecciones.

import type { ProgressSummary } from "./calculate-progress";

export function buildProgressLabel(progress: ProgressSummary): string {
  const lessonsLabel = `${progress.completedLessons} de ${progress.totalLessons} lecciones`;
  const pendingAssignments =
    progress.totalRequiredAssignments -
    progress.completedRequiredAssignments;
  if (pendingAssignments <= 0) return lessonsLabel;
  const tareasLabel =
    pendingAssignments === 1
      ? "1 tarea pendiente"
      : `${pendingAssignments} tareas pendientes`;
  return `${lessonsLabel} (${tareasLabel})`;
}
