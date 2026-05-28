// Calculo puro del progreso ponderado de un curso (Bloque post-23).
//
// Modelo:
//   - Cada modulo aporta puntos al curso = weight_normalizado *
//     (items_completados / items_totales_del_modulo).
//   - Items del modulo = lecciones + tareas con is_required=true.
//   - weight_normalizado = module.weight / sum(weights).
//
// Edge cases:
//   - Modulo con weight=0: no aporta. Sus items se contabilizan en
//     el desglose por transparencia pero no entran en el promedio.
//   - Modulo sin items: contribuye 0 puntos aunque tenga weight.
//   - Curso sin modulos: progreso = 0%.
//   - Suma de pesos != 100: normalizamos dividiendo por la suma.
//     Garantiza que el progreso llegue a 100% cuando todo esta
//     completado, independientemente de cuanto sumen los pesos.
//
// Sin acceso a BD. El caller pasa el array ya resuelto.

import type { ProgressSummary } from "./calculate-progress";

export interface ModuleProgressInput {
  weight: number;
  completedLessons: number;
  totalLessons: number;
  completedRequiredAssignments: number;
  totalRequiredAssignments: number;
}

export function calculateWeightedCourseProgress(
  modules: ModuleProgressInput[],
): ProgressSummary {
  const totalLessons = modules.reduce((sum, m) => sum + m.totalLessons, 0);
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.completedLessons,
    0,
  );
  const totalRequiredAssignments = modules.reduce(
    (sum, m) => sum + m.totalRequiredAssignments,
    0,
  );
  const completedRequiredAssignments = modules.reduce(
    (sum, m) => sum + m.completedRequiredAssignments,
    0,
  );
  const totalItems = totalLessons + totalRequiredAssignments;
  const completedItems = completedLessons + completedRequiredAssignments;

  if (modules.length === 0) {
    return {
      percentage: 0,
      completedCount: 0,
      totalCount: 0,
      completedLessons: 0,
      totalLessons: 0,
      completedRequiredAssignments: 0,
      totalRequiredAssignments: 0,
    };
  }

  // Filter de modulos que CONTRIBUYEN al progreso ponderado:
  //   - weight > 0
  //   - tiene al menos 1 item
  // Los excluidos cuentan en el desglose visual (items totales) pero
  // no en el promedio ponderado del curso.
  const contributing = modules.filter(
    (m) =>
      m.weight > 0 &&
      m.totalLessons + m.totalRequiredAssignments > 0,
  );

  if (contributing.length === 0) {
    return {
      percentage: 0,
      completedCount: completedItems,
      totalCount: totalItems,
      completedLessons,
      totalLessons,
      completedRequiredAssignments,
      totalRequiredAssignments,
    };
  }

  const totalWeights = contributing.reduce((sum, m) => sum + m.weight, 0);

  // Suma ponderada normalizada. Cada modulo aporta:
  //   (weight / totalWeights) * (completedItems / totalItems) * 100
  // = (weight * completedItems / totalItems) / totalWeights * 100
  let weightedSum = 0;
  for (const m of contributing) {
    const moduleItems = m.totalLessons + m.totalRequiredAssignments;
    const moduleCompleted =
      m.completedLessons + m.completedRequiredAssignments;
    const moduleFraction = moduleCompleted / moduleItems;
    weightedSum += m.weight * moduleFraction;
  }

  const percentage = Math.round((weightedSum / totalWeights) * 100);

  return {
    percentage,
    completedCount: completedItems,
    totalCount: totalItems,
    completedLessons,
    totalLessons,
    completedRequiredAssignments,
    totalRequiredAssignments,
  };
}
