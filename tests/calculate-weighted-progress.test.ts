// Tests de calculateWeightedCourseProgress (Bloque post-23).
// Cubre edge cases del analisis de impacto:
//   - Modulo con weight=0 no aporta.
//   - Modulo sin items no contribuye aunque tenga weight.
//   - Curso sin modulos -> 0%.
//   - Suma de pesos != 100 se normaliza.
//   - Mezcla lecciones + tareas obligatorias dentro de un modulo.

import { describe, it, expect } from "vitest";
import {
  calculateWeightedCourseProgress,
  type ModuleProgressInput,
} from "@/modules/progress/lib";

function mod(
  overrides: Partial<ModuleProgressInput>,
): ModuleProgressInput {
  return {
    weight: 50,
    completedLessons: 0,
    totalLessons: 0,
    completedRequiredAssignments: 0,
    totalRequiredAssignments: 0,
    ...overrides,
  };
}

describe("calculateWeightedCourseProgress", () => {
  it("curso sin modulos -> 0%", () => {
    const result = calculateWeightedCourseProgress([]);
    expect(result.percentage).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("curso con 1 modulo 100% completado y peso 100 -> 100%", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 100, totalLessons: 5, completedLessons: 5 }),
    ]);
    expect(result.percentage).toBe(100);
    expect(result.completedLessons).toBe(5);
    expect(result.totalLessons).toBe(5);
  });

  it("curso con 1 modulo 50% completado -> 50%", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 100, totalLessons: 10, completedLessons: 5 }),
    ]);
    expect(result.percentage).toBe(50);
  });

  it("modulo con weight=0 no aporta al porcentaje pero items aparecen en desglose", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 0, totalLessons: 4, completedLessons: 4 }),
      mod({ weight: 100, totalLessons: 4, completedLessons: 2 }),
    ]);
    // Solo el segundo modulo contribuye: 2/4 = 50%.
    expect(result.percentage).toBe(50);
    // El desglose total incluye items de ambos modulos.
    expect(result.totalLessons).toBe(8);
    expect(result.completedLessons).toBe(6);
  });

  it("modulo sin items no contribuye aunque tenga weight", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 50, totalLessons: 0 }),
      mod({ weight: 50, totalLessons: 4, completedLessons: 4 }),
    ]);
    // El primer modulo no contribuye (0 items). El segundo modulo
    // 100% completado aporta el 100% normalizado.
    expect(result.percentage).toBe(100);
  });

  it("suma pesos != 100 se normaliza", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 30, totalLessons: 4, completedLessons: 4 }),
      mod({ weight: 30, totalLessons: 4, completedLessons: 4 }),
      mod({ weight: 30, totalLessons: 4, completedLessons: 0 }),
    ]);
    // Suma pesos = 90 (no 100). Dos modulos 100%, uno 0%.
    // Normalizado: (30*1 + 30*1 + 30*0) / 90 = 60/90 = 66.67 -> round 67%.
    expect(result.percentage).toBe(67);
  });

  it("mezcla lecciones y tareas obligatorias", () => {
    const result = calculateWeightedCourseProgress([
      mod({
        weight: 100,
        totalLessons: 3,
        completedLessons: 3,
        totalRequiredAssignments: 1,
        completedRequiredAssignments: 0,
      }),
    ]);
    // Items totales del modulo = 4 (3 lecciones + 1 tarea), completados = 3.
    // 3/4 = 75%.
    expect(result.percentage).toBe(75);
    expect(result.completedLessons).toBe(3);
    expect(result.totalLessons).toBe(3);
    expect(result.completedRequiredAssignments).toBe(0);
    expect(result.totalRequiredAssignments).toBe(1);
  });

  it("tarea obligatoria pendiente bloquea el 100% del modulo", () => {
    const result = calculateWeightedCourseProgress([
      mod({
        weight: 100,
        totalLessons: 5,
        completedLessons: 5,
        totalRequiredAssignments: 2,
        completedRequiredAssignments: 1,
      }),
    ]);
    // 5 lecciones OK + 1/2 tareas = 6/7 = 85.7% -> round 86%.
    expect(result.percentage).toBe(86);
  });

  it("dos modulos con pesos distintos, uno 100% y otro 50%", () => {
    const result = calculateWeightedCourseProgress([
      mod({ weight: 70, totalLessons: 10, completedLessons: 10 }),
      mod({ weight: 30, totalLessons: 10, completedLessons: 5 }),
    ]);
    // (70*1 + 30*0.5) / 100 = 85.
    expect(result.percentage).toBe(85);
  });
});
