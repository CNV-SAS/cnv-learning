// Tests de los Zod schemas del modulo forum. Verifican limites de
// title/body (alineados con SECURITY.md 161-162) y validacion de
// UUIDs en los IDs que llegan via formData.

import { describe, it, expect } from "vitest";
import {
  createThreadSchema,
  editThreadSchema,
  createReplySchema,
} from "@/modules/forum/validations";

const validForumId = "00000000-0000-0000-0000-000000000001";
const validCourseId = "00000000-0000-0000-0000-000000000002";
const validThreadId = "00000000-0000-0000-0000-000000000003";

describe("createThreadSchema", () => {
  it("acepta input valido", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "Mi primer post",
      body: "Este es el cuerpo del post con suficiente texto.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza forumId no UUID", () => {
    const r = createThreadSchema.safeParse({
      forumId: "not-a-uuid",
      courseId: validCourseId,
      title: "Título OK",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza courseId no UUID", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: "abc",
      title: "Título OK",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza title menor a 3 caracteres", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "ab",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza title mayor a 200 caracteres", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "a".repeat(201),
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body menor a 10 caracteres", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título OK",
      body: "corto",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body mayor a 10000 caracteres", () => {
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título OK",
      body: "a".repeat(10001),
    });
    expect(r.success).toBe(false);
  });

  it("aplica trim al title y body antes de validar longitud", () => {
    // 12 chars con espacios al rededor; tras trim son 8: invalido para body.
    const r = createThreadSchema.safeParse({
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título OK",
      body: "  short  ",
    });
    expect(r.success).toBe(false);
  });
});

describe("editThreadSchema", () => {
  it("acepta input valido con los 3 IDs", () => {
    const r = editThreadSchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título actualizado",
      body: "Cuerpo actualizado con texto suficiente.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza threadId no UUID", () => {
    const r = editThreadSchema.safeParse({
      threadId: "x",
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título OK",
      body: "Cuerpo con texto válido.",
    });
    expect(r.success).toBe(false);
  });

  it("usa los mismos limites que createThread (title 3-200, body 10-10000)", () => {
    const r1 = editThreadSchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      title: "ab",
      body: "Cuerpo con texto válido.",
    });
    expect(r1.success).toBe(false);

    const r2 = editThreadSchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      title: "Título OK",
      body: "short",
    });
    expect(r2.success).toBe(false);
  });
});

describe("createReplySchema", () => {
  it("acepta input valido con body corto (replies pueden ser breves)", () => {
    const r = createReplySchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      body: "Gracias",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza body vacio", () => {
    const r = createReplySchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      body: "",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body con solo whitespace tras trim", () => {
    const r = createReplySchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      body: "   \n   ",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza body mayor a 10000 caracteres", () => {
    const r = createReplySchema.safeParse({
      threadId: validThreadId,
      forumId: validForumId,
      courseId: validCourseId,
      body: "a".repeat(10001),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza threadId no UUID", () => {
    const r = createReplySchema.safeParse({
      threadId: "not-uuid",
      forumId: validForumId,
      courseId: validCourseId,
      body: "Una respuesta válida.",
    });
    expect(r.success).toBe(false);
  });
});
