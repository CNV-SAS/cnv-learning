// Tests de validaciones Zod del modulo calendar (Bloque 15).

import { describe, it, expect } from "vitest";
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
} from "@/modules/calendar/validations";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("createEventSchema", () => {
  it("acepta input completo valido", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen módulo 1",
      description: "Cubre lecciones 1-4.",
      startsAt: "2026-06-15",
      endsAt: "2026-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("acepta sin description y sin endsAt", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Inicio del curso",
      startsAt: "2026-04-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.endsAt).toBeUndefined();
    }
  });

  it("normaliza description vacia a undefined", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen",
      description: "   ",
      startsAt: "2026-06-15",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  it("rechaza titulo menor a 3 caracteres", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "ab",
      startsAt: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza fecha mal formada (no YYYY-MM-DD)", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen",
      startsAt: "15/06/2026",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza endsAt anterior a startsAt (refine A4)", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen",
      startsAt: "2026-06-15",
      endsAt: "2026-06-10",
    });
    expect(result.success).toBe(false);
  });

  it("acepta endsAt igual a startsAt (single-day rango explicito)", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen",
      startsAt: "2026-06-15",
      endsAt: "2026-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza courseId no-UUID", () => {
    const result = createEventSchema.safeParse({
      courseId: "not-uuid",
      title: "Examen",
      startsAt: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza description > 2000 chars", () => {
    const result = createEventSchema.safeParse({
      courseId: VALID_UUID,
      title: "Examen",
      description: "x".repeat(2001),
      startsAt: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("acepta input completo valido", () => {
    const result = updateEventSchema.safeParse({
      eventId: VALID_UUID,
      title: "Examen reagendado",
      description: "Nueva fecha.",
      startsAt: "2026-06-20",
      endsAt: "2026-06-20",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza eventId mal formado", () => {
    const result = updateEventSchema.safeParse({
      eventId: "abc",
      title: "Examen",
      startsAt: "2026-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("aplica refine endsAt >= startsAt en update tambien", () => {
    const result = updateEventSchema.safeParse({
      eventId: VALID_UUID,
      title: "Examen",
      startsAt: "2026-06-15",
      endsAt: "2026-06-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteEventSchema", () => {
  it("acepta eventId UUID", () => {
    const result = deleteEventSchema.safeParse({ eventId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rechaza eventId mal formado", () => {
    const result = deleteEventSchema.safeParse({ eventId: "xx" });
    expect(result.success).toBe(false);
  });
});
