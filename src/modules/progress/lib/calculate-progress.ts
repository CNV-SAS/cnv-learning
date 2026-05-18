// Calculo puro de porcentaje de progreso. Sin acceso a BD. El caller
// (progressService) le pasa los counts ya resueltos via repos. Edge
// case total=0 retorna 0% sin division por cero.

export interface ProgressSummary {
  percentage: number;
  completedCount: number;
  totalCount: number;
}

export function calculateProgress(
  completedCount: number,
  totalCount: number,
): ProgressSummary {
  const percentage =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { percentage, completedCount, totalCount };
}
