// Calculo puro de porcentaje de progreso. Sin acceso a BD. El caller
// (progressService) le pasa los counts ya resueltos via repos. Edge
// case total=0 retorna 0% sin division por cero.
//
// Bloque post-23 (progreso ponderado): ProgressSummary extendido para
// incluir desglose entre lecciones y tareas obligatorias. Mantiene
// completedCount/totalCount (= items totales: lecciones + tareas
// obligatorias) para backward-compat con callers que solo leen el
// par. Campos completedLessons/totalLessons/completedRequiredAssignments/
// totalRequiredAssignments son los nuevos para UI que quiera mostrar
// "X lecciones (M tareas pendientes)".
//
// calculateProgress sigue siendo la forma simple ("X de Y items") para
// progreso por modulo o cualquier caso donde no aplica el ponderado.
// Para progreso de curso ponderado por pesos de modulos, usar
// calculateWeightedCourseProgress (archivo separado).

export interface ProgressSummary {
  percentage: number;
  completedCount: number;
  totalCount: number;
  // Desglose (Bloque post-23). Cuando se usa calculateProgress simple
  // sin breakdown, se rellenan con los mismos valores totales y 0.
  // El service progressService los rellena cuando aplica el modelo
  // ponderado (getCourseSummary y getModulesWithProgress).
  completedLessons: number;
  totalLessons: number;
  completedRequiredAssignments: number;
  totalRequiredAssignments: number;
}

export function calculateProgress(
  completedCount: number,
  totalCount: number,
): ProgressSummary {
  const percentage =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return {
    percentage,
    completedCount,
    totalCount,
    // En la variante simple no hay breakdown; el caller que lo necesite
    // usa progressService que rellena via calculateWeightedCourseProgress.
    completedLessons: completedCount,
    totalLessons: totalCount,
    completedRequiredAssignments: 0,
    totalRequiredAssignments: 0,
  };
}
