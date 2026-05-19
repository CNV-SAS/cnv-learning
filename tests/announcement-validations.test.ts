// Tests de los Zod schemas del modulo announcements. Verifican
// limites title 3-200, body 10-5000, trim antes de validar, UUID
// del courseId solo en course scope.

import { describe, it, expect } from "vitest";
import {
  createCourseAnnouncementSchema,
  createGlobalAnnouncementSchema,
} from "@/modules/announcements/validations";

const validCourseId = "00000000-0000-0000-0000-000000000001";

describe("createCourseAnnouncementSchema", () => {
  it("acepta input valido", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "Aviso importante",
      body: "Detalles del aviso con suficiente texto.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza courseId no UUID", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: "not-a-uuid",
      title: "Título OK",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza title menor a 3", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "ab",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza title mayor a 200", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "a".repeat(201),
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body menor a 10", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "Título OK",
      body: "corto",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body mayor a 5000", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "Título OK",
      body: "a".repeat(5001),
    });
    expect(r.success).toBe(false);
  });

  it("aplica trim antes de validar longitud", () => {
    const r = createCourseAnnouncementSchema.safeParse({
      courseId: validCourseId,
      title: "Título OK",
      body: "   short   ",
    });
    expect(r.success).toBe(false);
  });
});

describe("createGlobalAnnouncementSchema", () => {
  it("acepta input valido sin courseId", () => {
    const r = createGlobalAnnouncementSchema.safeParse({
      title: "Anuncio global",
      body: "Detalles del anuncio global con texto suficiente.",
    });
    expect(r.success).toBe(true);
  });

  it("ignora courseId si lo manda (extra fields permitidos)", () => {
    const r = createGlobalAnnouncementSchema.safeParse({
      title: "Anuncio global",
      body: "Detalles del anuncio global con texto suficiente.",
      courseId: validCourseId,
    });
    expect(r.success).toBe(true);
  });

  it("usa los mismos limites (title 3-200, body 10-5000)", () => {
    expect(
      createGlobalAnnouncementSchema.safeParse({
        title: "ab",
        body: "Cuerpo con texto válido.",
      }).success,
    ).toBe(false);
    expect(
      createGlobalAnnouncementSchema.safeParse({
        title: "Título OK",
        body: "short",
      }).success,
    ).toBe(false);
  });
});
