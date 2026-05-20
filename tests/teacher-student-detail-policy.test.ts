// Tests de canAccessTeacherStudentDetail. Defensa contra URL
// manipulation: el teacher debe enseñar el curso Y el alumno debe
// estar enrolled activo en ese curso. Admin pasa por bypass.

import { describe, it, expect } from "vitest";
import { canAccessTeacherStudentDetail } from "@/modules/teacher-panel/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
  };
}

describe("canAccessTeacherStudentDetail", () => {
  it("admin pasa siempre (bypass)", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("admin"), {
        isTeacherOfCourse: false,
        studentEnrolledInCourse: false,
      }),
    ).toBe(true);
    expect(
      canAccessTeacherStudentDetail(makeUser("admin"), {
        isTeacherOfCourse: true,
        studentEnrolledInCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher con asignacion al curso Y alumno enrolled pasa", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("teacher"), {
        isTeacherOfCourse: true,
        studentEnrolledInCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher SIN asignacion al curso NO pasa (aunque alumno enrolled)", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("teacher"), {
        isTeacherOfCourse: false,
        studentEnrolledInCourse: true,
      }),
    ).toBe(false);
  });

  it("teacher CON asignacion pero alumno NO enrolled NO pasa", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("teacher"), {
        isTeacherOfCourse: true,
        studentEnrolledInCourse: false,
      }),
    ).toBe(false);
  });

  it("teacher sin ningun contexto NO pasa", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("teacher"), {
        isTeacherOfCourse: false,
        studentEnrolledInCourse: false,
      }),
    ).toBe(false);
  });

  it("student NO pasa nunca (no aplica)", () => {
    expect(
      canAccessTeacherStudentDetail(makeUser("student"), {
        isTeacherOfCourse: true,
        studentEnrolledInCourse: true,
      }),
    ).toBe(false);
  });
});
