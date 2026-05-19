// Tests del Zod schema del output de grade. Valida shape + tipos +
// edge cases (negativo, feedback vacio, campos faltantes/extras).

import { describe, it, expect } from "vitest";
import { gradeOutputSchema } from "@/modules/assignments/ai/schema";

describe("gradeOutputSchema", () => {
  it("acepta input valido", () => {
    const result = gradeOutputSchema.safeParse({
      suggestedGrade: 85,
      generatedFeedback: "Buen trabajo en general. Profundiza más.",
    });
    expect(result.success).toBe(true);
  });

  it("acepta suggestedGrade 0", () => {
    const result = gradeOutputSchema.safeParse({
      suggestedGrade: 0,
      generatedFeedback: "Entrega vacía.",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza suggestedGrade negativo", () => {
    const result = gradeOutputSchema.safeParse({
      suggestedGrade: -1,
      generatedFeedback: "...",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza feedback vacio", () => {
    const result = gradeOutputSchema.safeParse({
      suggestedGrade: 50,
      generatedFeedback: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza falta de campos requeridos", () => {
    expect(
      gradeOutputSchema.safeParse({ suggestedGrade: 80 }).success,
    ).toBe(false);
    expect(
      gradeOutputSchema.safeParse({ generatedFeedback: "x" }).success,
    ).toBe(false);
  });

  it("rechaza tipos incorrectos", () => {
    expect(
      gradeOutputSchema.safeParse({
        suggestedGrade: "85",
        generatedFeedback: "x",
      }).success,
    ).toBe(false);
    expect(
      gradeOutputSchema.safeParse({
        suggestedGrade: 85,
        generatedFeedback: 123,
      }).success,
    ).toBe(false);
  });

  it("ignora campos extra (no strict)", () => {
    const result = gradeOutputSchema.safeParse({
      suggestedGrade: 80,
      generatedFeedback: "x",
      extraField: "ignored",
    });
    expect(result.success).toBe(true);
  });
});
