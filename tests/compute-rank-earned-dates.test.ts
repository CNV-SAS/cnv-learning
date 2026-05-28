// Tests del helper puro computeRankEarnedDatesFromTimeline
// (Bloque post-23). Mock manual del timeline; cubre la logica de
// detectar las fechas exactas en que el progreso ponderado cruza
// 50% (Senior) y 85% (Master) iterando un timeline unificado de
// lecciones + tareas obligatorias.

import { describe, it, expect } from "vitest";
import {
  computeRankEarnedDatesFromTimeline,
  type ModuleProgressInput,
  type TimelineEvent,
} from "@/modules/progress/lib";

// Helper: crea un counter inicial (todo en 0 menos los totals).
function modCounter(
  totalLessons: number,
  totalAssignments: number,
  weight = 50,
): ModuleProgressInput {
  return {
    weight,
    completedLessons: 0,
    totalLessons,
    completedRequiredAssignments: 0,
    totalRequiredAssignments: totalAssignments,
  };
}

describe("computeRankEarnedDatesFromTimeline", () => {
  it("timeline vacio -> ambas fechas null", () => {
    const result = computeRankEarnedDatesFromTimeline(
      [modCounter(5, 0)],
      [],
    );
    expect(result.seniorAt).toBeNull();
    expect(result.masterAt).toBeNull();
  });

  it("seniorAt registra la fecha del evento que cruza el 50%", () => {
    // 1 modulo, 10 lecciones, weight 100. Cruza 50% al completar
    // la 5ta leccion.
    const counters = [modCounter(10, 0, 100)];
    const events: TimelineEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push({
        timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        kind: "lesson",
        moduleIdx: 0,
      });
    }
    const result = computeRankEarnedDatesFromTimeline(counters, events);
    // 5/10 = 50% -> seniorAt = evento 5 (2026-01-05).
    expect(result.seniorAt).toBe("2026-01-05T12:00:00Z");
    // 9/10 = 90% >= 85% -> masterAt = evento 9 (2026-01-09).
    expect(result.masterAt).toBe("2026-01-09T12:00:00Z");
  });

  it("submissions de tareas obligatorias contribuyen al timeline", () => {
    // 1 modulo: 2 lecciones + 2 tareas obligatorias = 4 items.
    // Lessons completadas: 0. Submissions: 2 tareas -> 2/4 = 50%.
    const counters = [modCounter(2, 2, 100)];
    const events: TimelineEvent[] = [
      {
        timestamp: "2026-02-01T10:00:00Z",
        kind: "assignment",
        moduleIdx: 0,
      },
      {
        timestamp: "2026-02-02T10:00:00Z",
        kind: "assignment",
        moduleIdx: 0,
      },
    ];
    const result = computeRankEarnedDatesFromTimeline(counters, events);
    // Al 2do evento: 2/4 = 50% -> seniorAt.
    expect(result.seniorAt).toBe("2026-02-02T10:00:00Z");
    expect(result.masterAt).toBeNull();
  });

  it("mezcla lecciones + tareas en orden temporal", () => {
    // 1 modulo: 4 lecciones + 1 tarea obligatoria = 5 items.
    // Tarea entrega el 2026-02-15 antes que algunas lecciones.
    const counters = [modCounter(4, 1, 100)];
    const events: TimelineEvent[] = [
      { timestamp: "2026-02-10T10:00:00Z", kind: "lesson", moduleIdx: 0 },
      { timestamp: "2026-02-11T10:00:00Z", kind: "lesson", moduleIdx: 0 },
      { timestamp: "2026-02-15T10:00:00Z", kind: "assignment", moduleIdx: 0 },
      { timestamp: "2026-02-20T10:00:00Z", kind: "lesson", moduleIdx: 0 },
      { timestamp: "2026-02-21T10:00:00Z", kind: "lesson", moduleIdx: 0 },
    ];
    const result = computeRankEarnedDatesFromTimeline(counters, events);
    // Eventos ordenados:
    //   1/5=20% (10)
    //   2/5=40% (11)
    //   3/5=60% -> seniorAt (15)
    //   4/5=80% (20)
    //   5/5=100% -> masterAt (21).
    expect(result.seniorAt).toBe("2026-02-15T10:00:00Z");
    expect(result.masterAt).toBe("2026-02-21T10:00:00Z");
  });

  it("modulos con weights distintos: senior cruza por el modulo pesado", () => {
    // Modulo A weight 80 con 10 items, modulo B weight 20 con 10 items.
    // Si completo todo el B (20/100) = 20% -> no cruza senior.
    // Si completo 4 items del A (32/100) + B completo (20/100) = 52% -> senior.
    const counters = [modCounter(10, 0, 80), modCounter(10, 0, 20)];
    const events: TimelineEvent[] = [];
    // Primero todo el modulo B (eventos 1..10).
    for (let i = 0; i < 10; i++) {
      events.push({
        timestamp: `2026-03-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
        kind: "lesson",
        moduleIdx: 1,
      });
    }
    // Despues lecciones del modulo A (eventos 11..20).
    for (let i = 0; i < 10; i++) {
      events.push({
        timestamp: `2026-03-${String(i + 11).padStart(2, "0")}T10:00:00Z`,
        kind: "lesson",
        moduleIdx: 0,
      });
    }
    const result = computeRankEarnedDatesFromTimeline(counters, events);
    // Al evento 14 (4 lecciones del A): (80 * 4/10 + 20) / 100 = 52%. seniorAt.
    expect(result.seniorAt).toBe("2026-03-14T10:00:00Z");
  });

  it("ignora eventos con moduleIdx invalido", () => {
    const counters = [modCounter(5, 0)];
    const events: TimelineEvent[] = [
      { timestamp: "2026-04-01T10:00:00Z", kind: "lesson", moduleIdx: 0 },
      { timestamp: "2026-04-02T10:00:00Z", kind: "lesson", moduleIdx: 99 },
      { timestamp: "2026-04-03T10:00:00Z", kind: "lesson", moduleIdx: 0 },
    ];
    const result = computeRankEarnedDatesFromTimeline(counters, events);
    // 1/5=20%, [99 ignorado], 2/5=40%. Sin cruzar 50%.
    expect(result.seniorAt).toBeNull();
  });

  it("no muta el array de counters input", () => {
    const initial = [modCounter(5, 0, 100)];
    const events: TimelineEvent[] = [
      { timestamp: "2026-05-01T10:00:00Z", kind: "lesson", moduleIdx: 0 },
    ];
    computeRankEarnedDatesFromTimeline(initial, events);
    expect(initial[0].completedLessons).toBe(0);
  });
});
