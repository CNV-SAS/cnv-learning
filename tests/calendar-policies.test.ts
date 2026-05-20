// Tests de policies de calendario (Bloque 15). Patron
// context-based: el caller pre-resuelve isEnrolled / isTeacherOf
// antes de invocar.

import { describe, it, expect } from "vitest";
import {
  canViewCalendar,
  canEditCalendar,
} from "@/modules/calendar/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
  };
}

describe("canViewCalendar", () => {
  it("admin ve cualquier calendario (sin importar context)", () => {
    expect(
      canViewCalendar(makeUser("admin"), {
        isEnrolledInCourse: false,
        isTeacherOfCourse: false,
      }),
    ).toBe(true);
  });

  it("teacher ve calendario solo si esta asignado al curso", () => {
    expect(
      canViewCalendar(makeUser("teacher"), {
        isEnrolledInCourse: false,
        isTeacherOfCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher NO ve calendario de cursos donde no esta asignado", () => {
    expect(
      canViewCalendar(makeUser("teacher"), {
        isEnrolledInCourse: false,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("student ve calendario solo si esta enrolled", () => {
    expect(
      canViewCalendar(makeUser("student"), {
        isEnrolledInCourse: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(true);
  });

  it("student NO ve calendario de cursos donde no esta enrolled", () => {
    expect(
      canViewCalendar(makeUser("student"), {
        isEnrolledInCourse: false,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });
});

describe("canEditCalendar", () => {
  it("admin edita cualquier calendario", () => {
    expect(
      canEditCalendar(makeUser("admin"), { isTeacherOfCourse: false }),
    ).toBe(true);
  });

  it("teacher edita solo si esta asignado al curso", () => {
    expect(
      canEditCalendar(makeUser("teacher"), { isTeacherOfCourse: true }),
    ).toBe(true);
  });

  it("teacher NO edita calendario de cursos ajenos (consideracion A6)", () => {
    expect(
      canEditCalendar(makeUser("teacher"), { isTeacherOfCourse: false }),
    ).toBe(false);
  });

  it("student NO edita calendarios (ni del curso enrolled)", () => {
    expect(
      canEditCalendar(makeUser("student"), { isTeacherOfCourse: false }),
    ).toBe(false);
  });
});
