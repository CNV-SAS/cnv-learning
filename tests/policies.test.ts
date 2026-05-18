// Tests de policies. Bloque 3 sub-bloque 3.3 establece el patron
// (funcion pura por test, factory minima de user); Bloque 4 sub-bloque
// 4.2 lo extiende a las policies de courses con context resuelto por
// caller (defensa en profundidad documentada en can-view-course.ts).

import { describe, it, expect } from "vitest";
import { getNavigationFor } from "@/modules/auth/policies/navigation";
import { canViewCourse } from "@/modules/courses/policies/can-view-course";
import { canViewLesson } from "@/modules/courses/policies/can-view-lesson";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
  };
}

describe("getNavigationFor", () => {
  it("admin ve Dashboard + Admin", () => {
    const items = getNavigationFor(makeUser("admin"));
    expect(items.map((i) => i.href)).toEqual(["/dashboard", "/admin"]);
  });

  it("teacher ve solo Dashboard", () => {
    const items = getNavigationFor(makeUser("teacher"));
    expect(items.map((i) => i.href)).toEqual(["/dashboard"]);
  });

  it("student ve solo Dashboard", () => {
    const items = getNavigationFor(makeUser("student"));
    expect(items.map((i) => i.href)).toEqual(["/dashboard"]);
  });

  // Regresion del bug de sub-bloque 3.5: si NavItem se llenara con
  // referencias a componentes React (icon: LucideIcon), el array
  // dejaria de ser serializable y romperia al cruzar la frontera
  // Server -> Client. Verificamos via JSON roundtrip que el shape
  // se mantiene plain.
  it("items sobreviven JSON roundtrip (shape serializable)", () => {
    const items = getNavigationFor(makeUser("admin"));
    const cloned = JSON.parse(JSON.stringify(items));
    expect(cloned).toEqual(items);
  });
});

describe("canViewCourse", () => {
  it("admin ve cualquier curso (incluso si RLS no lo retorna)", () => {
    expect(
      canViewCourse(makeUser("admin"), { courseExists: false }),
    ).toBe(true);
  });

  it("student ve curso cuando RLS lo retorna (enrolled)", () => {
    expect(
      canViewCourse(makeUser("student"), { courseExists: true }),
    ).toBe(true);
  });

  it("student no ve curso cuando RLS no lo retorna", () => {
    expect(
      canViewCourse(makeUser("student"), { courseExists: false }),
    ).toBe(false);
  });

  it("teacher ve curso cuando RLS lo retorna (assigned)", () => {
    expect(
      canViewCourse(makeUser("teacher"), { courseExists: true }),
    ).toBe(true);
  });

  it("teacher no ve curso cuando RLS no lo retorna", () => {
    expect(
      canViewCourse(makeUser("teacher"), { courseExists: false }),
    ).toBe(false);
  });
});

describe("canViewLesson", () => {
  it("admin ve cualquier leccion", () => {
    expect(
      canViewLesson(makeUser("admin"), { lessonExists: false }),
    ).toBe(true);
  });

  it("student ve leccion cuando RLS la retorna", () => {
    expect(
      canViewLesson(makeUser("student"), { lessonExists: true }),
    ).toBe(true);
  });

  it("student no ve leccion cuando RLS no la retorna", () => {
    expect(
      canViewLesson(makeUser("student"), { lessonExists: false }),
    ).toBe(false);
  });

  it("teacher ve leccion cuando RLS la retorna", () => {
    expect(
      canViewLesson(makeUser("teacher"), { lessonExists: true }),
    ).toBe(true);
  });

  it("teacher no ve leccion cuando RLS no la retorna", () => {
    expect(
      canViewLesson(makeUser("teacher"), { lessonExists: false }),
    ).toBe(false);
  });
});
