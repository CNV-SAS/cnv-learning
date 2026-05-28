// Tests del helper puro calculateProgress.
// Edge cases relevantes: total=0 (sin division por cero) y
// redondeo de fracciones (Math.round).

import { describe, it, expect } from "vitest";
import { calculateProgress } from "@/modules/progress/lib/calculate-progress";

describe("calculateProgress", () => {
  it("0 de 10: 0%", () => {
    expect(calculateProgress(0, 10).percentage).toBe(0);
  });

  it("5 de 10: 50%", () => {
    expect(calculateProgress(5, 10).percentage).toBe(50);
  });

  it("10 de 10: 100%", () => {
    expect(calculateProgress(10, 10).percentage).toBe(100);
  });

  it("0 de 0: 0% (sin division por cero)", () => {
    expect(calculateProgress(0, 0).percentage).toBe(0);
  });

  it("1 de 3: 33% (redondeo)", () => {
    expect(calculateProgress(1, 3).percentage).toBe(33);
  });

  it("2 de 3: 67% (redondeo)", () => {
    expect(calculateProgress(2, 3).percentage).toBe(67);
  });

  it("retorna shape completo (post-23 ProgressSummary extendido)", () => {
    expect(calculateProgress(3, 5)).toEqual({
      percentage: 60,
      completedCount: 3,
      totalCount: 5,
      // Bloque post-23: ProgressSummary extendido. La variante
      // simple replica completedCount/totalCount como
      // completedLessons/totalLessons; el breakdown explicito de
      // tareas obligatorias queda en 0 (lo rellena progressService
      // cuando aplica el modelo ponderado).
      completedLessons: 3,
      totalLessons: 5,
      completedRequiredAssignments: 0,
      totalRequiredAssignments: 0,
    });
  });
});
