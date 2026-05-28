// Helper puro para reconstruir las fechas en que el progreso ponderado
// cruzo los thresholds de Senior (>=50%) y Master (>=85%) iterando un
// timeline unificado de eventos (lesson_progress + submissions).
//
// Extraido de progressService.getRankEarnedDates para que sea pura y
// testeable sin mocks de repos. El service hace los fetches y arma
// las structures; este helper hace la iteracion.

import {
  calculateWeightedCourseProgress,
  type ModuleProgressInput,
} from "./calculate-weighted-progress";

export interface TimelineEvent {
  timestamp: string;
  // Indice del modulo en el array counters al que pertenece el evento.
  moduleIdx: number;
  // Distingue si el evento es completar una leccion o entregar una
  // tarea obligatoria. Determina cual contador del modulo incrementar.
  kind: "lesson" | "assignment";
}

export interface RankEarnedDatesResult {
  seniorAt: string | null;
  masterAt: string | null;
}

export function computeRankEarnedDatesFromTimeline(
  initialCounters: ModuleProgressInput[],
  events: TimelineEvent[],
): RankEarnedDatesResult {
  // Clonamos counters para no mutar el input.
  const counters = initialCounters.map((c) => ({ ...c }));
  // Eventos ordenados ascendente por timestamp para reconstruir
  // historia. El caller puede mandar ya ordenado; ordenamos
  // defensivamente.
  const sorted = events
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  let seniorAt: string | null = null;
  let masterAt: string | null = null;

  for (const event of sorted) {
    const counter = counters[event.moduleIdx];
    if (!counter) continue;
    if (event.kind === "lesson") counter.completedLessons += 1;
    else counter.completedRequiredAssignments += 1;

    const partial = calculateWeightedCourseProgress(counters);
    if (seniorAt === null && partial.percentage >= 50) {
      seniorAt = event.timestamp;
    }
    if (masterAt === null && partial.percentage >= 85) {
      masterAt = event.timestamp;
    }
    if (seniorAt !== null && masterAt !== null) break;
  }

  return { seniorAt, masterAt };
}
