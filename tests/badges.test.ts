// Tests del helper puro getBadge (modules/progress/lib/badges).
// Cubre los 3 umbrales del MVP y verifica serializability del
// shape (regression del 3.5-fix: badge debe cruzar frontera
// Server -> Client sin issues).

import { describe, it, expect } from "vitest";
import { getBadge } from "@/modules/progress/lib/badges";

describe("getBadge", () => {
  it("0%: Junior Bioimpedancia", () => {
    expect(getBadge(0).id).toBe("junior");
  });

  it("59%: Junior (limite superior del rango)", () => {
    expect(getBadge(59).id).toBe("junior");
  });

  it("60%: Senior (umbral exacto)", () => {
    expect(getBadge(60).id).toBe("senior");
  });

  it("99%: Senior (limite superior del rango)", () => {
    expect(getBadge(99).id).toBe("senior");
  });

  it("100%: Master ATLAS", () => {
    expect(getBadge(100).id).toBe("master");
  });

  it("badge incluye colorClass como string", () => {
    expect(typeof getBadge(60).colorClass).toBe("string");
  });

  it("badge sobrevive JSON roundtrip (shape serializable)", () => {
    const badge = getBadge(60);
    const cloned = JSON.parse(JSON.stringify(badge));
    expect(cloned).toEqual(badge);
  });
});
