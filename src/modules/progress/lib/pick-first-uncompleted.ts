// Selecciona el primer item con id que NO esta en el set de
// completados. Utility pura para "continuar donde dejaste"
// (progressService.getCourseSummary).
//
// Genérica sobre <T extends {id}> para mantenerse testable sin
// depender de la shape exacta de Lesson. Mismo patron de
// findNeighbors de Bloque 4 sub-bloque 4.2.

export function pickFirstUncompleted<T extends { id: string }>(
  items: T[],
  completedIds: Set<string>,
): T | null {
  return items.find((item) => !completedIds.has(item.id)) ?? null;
}
