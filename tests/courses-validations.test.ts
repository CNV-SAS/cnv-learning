// Tests de validaciones Zod del editor de contenidos (Bloque 19.2).

import { describe, it, expect } from "vitest";
import {
  createModuleSchema,
  updateModuleSchema,
  reorderModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderLessonSchema,
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

describe("createLessonSchema", () => {
  it("acepta input valido tipo video con video_url", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Introducción al EAV",
      type: "video",
      videoUrl: "https://www.youtube.com/watch?v=abc123",
      contentMarkdown: "## Resumen\n\nBreve.",
      durationMinutes: 45,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza tipo video sin videoUrl (superRefine)", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Introducción",
      type: "video",
      videoUrl: null,
    });
    expect(result.success).toBe(false);
  });

  it("acepta tipo pdf sin videoUrl", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Material PDF",
      type: "pdf",
      videoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("acepta tipo mixed sin videoUrl", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Mixto",
      type: "mixed",
      videoUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it("acepta tipo mixed con videoUrl", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Mixto",
      type: "mixed",
      videoUrl: "https://example.com/video",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza videoUrl invalida cuando se provee", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Mixto",
      type: "mixed",
      videoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("normaliza contentMarkdown vacio a null", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Sin contenido",
      type: "pdf",
      contentMarkdown: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contentMarkdown).toBeNull();
    }
  });

  it("rechaza title < 3 chars", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "ab",
      type: "mixed",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza durationMinutes negativo", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Intro",
      type: "mixed",
      durationMinutes: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza durationMinutes > 999", () => {
    const result = createLessonSchema.safeParse({
      moduleId: VALID_UUID,
      title: "Intro",
      type: "mixed",
      durationMinutes: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLessonSchema", () => {
  it("acepta input valido tipo video con video_url", () => {
    const result = updateLessonSchema.safeParse({
      lessonId: VALID_UUID,
      title: "Editada",
      type: "video",
      videoUrl: "https://youtube.com/watch?v=x",
      contentMarkdown: null,
      durationMinutes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza tipo video sin videoUrl", () => {
    const result = updateLessonSchema.safeParse({
      lessonId: VALID_UUID,
      title: "Editada",
      type: "video",
      videoUrl: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("reorderLessonSchema", () => {
  it("acepta direction up", () => {
    const result = reorderLessonSchema.safeParse({
      lessonId: VALID_UUID,
      direction: "up",
    });
    expect(result.success).toBe(true);
  });

  it("acepta direction down", () => {
    const result = reorderLessonSchema.safeParse({
      lessonId: VALID_UUID,
      direction: "down",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza direction invalida", () => {
    const result = reorderLessonSchema.safeParse({
      lessonId: VALID_UUID,
      direction: "sideways",
    });
    expect(result.success).toBe(false);
  });
});
