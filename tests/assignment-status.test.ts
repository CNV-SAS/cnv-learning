// Tests del lib puro assignment-status.ts (Bloque post-23 ISSUE 3
// sub-bloque 2). Cubre los 5 kinds del discriminated union y los
// helpers countsForProgress / canResubmit / passingThreshold /
// passes / computeAttemptsRemaining.

import { describe, it, expect } from "vitest";
import {
  canResubmit,
  computeAssignmentStatus,
  computeAttemptsRemaining,
  countsForProgress,
  passes,
  passingThreshold,
  type AssignmentStatusInput,
} from "@/modules/assignments/lib/assignment-status";

function input(
  overrides: Partial<AssignmentStatusInput> = {},
): AssignmentStatusInput {
  return {
    maxAttempts: 0,
    passingGradePercent: 70,
    assignmentMaxScore: 100,
    submittedAttempts: 0,
    latestFinalGrade: null,
    ...overrides,
  };
}

describe("passingThreshold", () => {
  it("70% sobre 100 = 70", () => {
    expect(passingThreshold(100, 70)).toBe(70);
  });

  it("60% sobre 50 = 30", () => {
    expect(passingThreshold(50, 60)).toBe(30);
  });

  it("0% sobre 100 = 0 (cualquier nota aprueba)", () => {
    expect(passingThreshold(100, 0)).toBe(0);
  });
});

describe("passes", () => {
  it("nota igual al threshold aprueba (>=)", () => {
    expect(passes(70, 70)).toBe(true);
  });

  it("nota arriba del threshold aprueba", () => {
    expect(passes(80, 70)).toBe(true);
  });

  it("nota debajo del threshold no aprueba", () => {
    expect(passes(69.9, 70)).toBe(false);
  });
});

describe("computeAttemptsRemaining", () => {
  it("max_attempts=0 -> null (ilimitados)", () => {
    expect(computeAttemptsRemaining(0, 5)).toBeNull();
  });

  it("max_attempts=3 con 1 usado -> 2", () => {
    expect(computeAttemptsRemaining(3, 1)).toBe(2);
  });

  it("max_attempts=3 con 3 usados -> 0", () => {
    expect(computeAttemptsRemaining(3, 3)).toBe(0);
  });

  it("max_attempts=3 con 5 usados (defensa) -> 0 (no negativo)", () => {
    expect(computeAttemptsRemaining(3, 5)).toBe(0);
  });
});

describe("computeAssignmentStatus", () => {
  it("sin intentos -> not_attempted", () => {
    const s = computeAssignmentStatus(input());
    expect(s.kind).toBe("not_attempted");
  });

  it("entregado sin calificar -> pending_grade", () => {
    const s = computeAssignmentStatus(
      input({ submittedAttempts: 1, latestFinalGrade: null }),
    );
    expect(s.kind).toBe("pending_grade");
    if (s.kind === "pending_grade") {
      expect(s.attemptsUsed).toBe(1);
      expect(s.attemptsRemaining).toBeNull(); // max=0
    }
  });

  it("entregado calificado >= threshold -> passed", () => {
    const s = computeAssignmentStatus(
      input({ submittedAttempts: 1, latestFinalGrade: 80 }),
    );
    expect(s.kind).toBe("passed");
    if (s.kind === "passed") {
      expect(s.finalGrade).toBe(80);
      expect(s.threshold).toBe(70);
    }
  });

  it("entregado calificado < threshold con ilimitados -> failed_can_retry", () => {
    const s = computeAssignmentStatus(
      input({ submittedAttempts: 2, latestFinalGrade: 60 }),
    );
    expect(s.kind).toBe("failed_can_retry");
    if (s.kind === "failed_can_retry") {
      expect(s.finalGrade).toBe(60);
      expect(s.attemptsUsed).toBe(2);
      expect(s.attemptsRemaining).toBeNull(); // ilimitados
    }
  });

  it("entregado calificado < threshold con intentos disponibles -> failed_can_retry", () => {
    const s = computeAssignmentStatus(
      input({
        maxAttempts: 3,
        submittedAttempts: 1,
        latestFinalGrade: 50,
      }),
    );
    expect(s.kind).toBe("failed_can_retry");
    if (s.kind === "failed_can_retry") {
      expect(s.attemptsRemaining).toBe(2);
    }
  });

  it("entregado calificado < threshold con intentos agotados -> failed_permanent", () => {
    const s = computeAssignmentStatus(
      input({
        maxAttempts: 3,
        submittedAttempts: 3,
        latestFinalGrade: 50,
      }),
    );
    expect(s.kind).toBe("failed_permanent");
    if (s.kind === "failed_permanent") {
      expect(s.attemptsUsed).toBe(3);
    }
  });

  it("threshold dinamico segun max_score y passing_grade", () => {
    // 60% sobre 50 = 30. Una nota de 30 aprueba.
    const s = computeAssignmentStatus(
      input({
        passingGradePercent: 60,
        assignmentMaxScore: 50,
        submittedAttempts: 1,
        latestFinalGrade: 30,
      }),
    );
    expect(s.kind).toBe("passed");
  });

  it("passing_grade=0 acepta cualquier nota", () => {
    const s = computeAssignmentStatus(
      input({
        passingGradePercent: 0,
        submittedAttempts: 1,
        latestFinalGrade: 0,
      }),
    );
    expect(s.kind).toBe("passed");
  });
});

describe("countsForProgress", () => {
  it("solo passed cuenta para progreso", () => {
    expect(
      countsForProgress({ kind: "passed", finalGrade: 80, threshold: 70 }),
    ).toBe(true);
    expect(countsForProgress({ kind: "not_attempted" })).toBe(false);
    expect(
      countsForProgress({
        kind: "pending_grade",
        attemptsUsed: 1,
        attemptsRemaining: null,
      }),
    ).toBe(false);
    expect(
      countsForProgress({
        kind: "failed_can_retry",
        finalGrade: 50,
        threshold: 70,
        attemptsUsed: 1,
        attemptsRemaining: 2,
      }),
    ).toBe(false);
    expect(
      countsForProgress({
        kind: "failed_permanent",
        finalGrade: 50,
        threshold: 70,
        attemptsUsed: 3,
      }),
    ).toBe(false);
  });
});

describe("canResubmit", () => {
  it("not_attempted y failed_can_retry permiten reenvio", () => {
    expect(canResubmit({ kind: "not_attempted" })).toBe(true);
    expect(
      canResubmit({
        kind: "failed_can_retry",
        finalGrade: 50,
        threshold: 70,
        attemptsUsed: 1,
        attemptsRemaining: 2,
      }),
    ).toBe(true);
  });

  it("pending_grade NO permite reenvio (esperando calificacion)", () => {
    expect(
      canResubmit({
        kind: "pending_grade",
        attemptsUsed: 1,
        attemptsRemaining: null,
      }),
    ).toBe(false);
  });

  it("passed NO permite reenvio (decision Q4: aprobada = locked)", () => {
    expect(
      canResubmit({
        kind: "passed",
        finalGrade: 80,
        threshold: 70,
      }),
    ).toBe(false);
  });

  it("failed_permanent NO permite reenvio (agoto intentos)", () => {
    expect(
      canResubmit({
        kind: "failed_permanent",
        finalGrade: 50,
        threshold: 70,
        attemptsUsed: 3,
      }),
    ).toBe(false);
  });
});
