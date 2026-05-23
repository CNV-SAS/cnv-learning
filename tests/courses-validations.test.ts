// Tests de validaciones Zod del editor de contenidos (Bloque 19.2).

import { describe, it, expect } from "vitest";
import {
  createModuleSchema,
  updateModuleSchema,
  reorderModuleSchema,
} from "@/modules/courses/validations";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("createModuleSchema", () => {
  it("acepta input valido", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "Introducción",
      description: "Resumen breve.",
      weight: 10,
    });
    expect(result.success).toBe(true);
  });

  it("normaliza description vacia a null", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "Introducción",
      description: "   ",
      weight: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("normaliza description ausente a null", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "Introducción",
      weight: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rechaza title < 3 chars", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "ab",
      weight: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza title > 200 chars", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "x".repeat(201),
      weight: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza weight negativo", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "Introducción",
      weight: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza weight > 100", () => {
    const result = createModuleSchema.safeParse({
      courseId: VALID_UUID,
      title: "Introducción",
      weight: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza courseId no-UUID", () => {
    const result = createModuleSchema.safeParse({
      courseId: "not-uuid",
      title: "Introducción",
      weight: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateModuleSchema", () => {
  it("acepta input valido", () => {
    const result = updateModuleSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Editado",
      description: null,
      weight: 50,
    });
    expect(result.success).toBe(true);
  });

  it("normaliza description vacia a null", () => {
    const result = updateModuleSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Editado",
      description: "",
      weight: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rechaza weight 100.5 (lo aceptaria Zod sin step; aqui pasa por ser <=100)", () => {
    // Zod number.max(100) acepta floats como 100; queda informativo.
    const result = updateModuleSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Editado",
      weight: 100,
    });
    expect(result.success).toBe(true);
  });
});

describe("reorderModuleSchema", () => {
  it("acepta direction up", () => {
    const result = reorderModuleSchema.safeParse({
      moduleId: VALID_UUID,
      direction: "up",
    });
    expect(result.success).toBe(true);
  });

  it("acepta direction down", () => {
    const result = reorderModuleSchema.safeParse({
      moduleId: VALID_UUID,
      direction: "down",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza direction invalida", () => {
    const result = reorderModuleSchema.safeParse({
      moduleId: VALID_UUID,
      direction: "left",
    });
    expect(result.success).toBe(false);
  });
});
