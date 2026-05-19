// Tests de las policies del modulo announcements. Mismo patron que
// policies.test.ts: factory minima de user, context-based, sin mocks.

import { describe, it, expect } from "vitest";
import {
  canEmitCourseAnnouncement,
  canEmitGlobalAnnouncement,
} from "@/modules/announcements/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
  };
}

describe("canEmitCourseAnnouncement", () => {
  it("teacher asignado al curso puede emitir", () => {
    expect(
      canEmitCourseAnnouncement(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher NO asignado al curso NO puede emitir", () => {
    expect(
      canEmitCourseAnnouncement(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("admin puede emitir aunque no este asignado", () => {
    expect(
      canEmitCourseAnnouncement(makeUser("admin"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(true);
  });

  it("student NO puede emitir", () => {
    expect(
      canEmitCourseAnnouncement(makeUser("student"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("ningun rol emite si el curso no existe", () => {
    expect(
      canEmitCourseAnnouncement(makeUser("admin"), {
        courseExists: false,
        isTeacherOfCourse: true,
      }),
    ).toBe(false);
    expect(
      canEmitCourseAnnouncement(makeUser("teacher"), {
        courseExists: false,
        isTeacherOfCourse: true,
      }),
    ).toBe(false);
  });
});

describe("canEmitGlobalAnnouncement", () => {
  it("admin puede emitir global", () => {
    expect(canEmitGlobalAnnouncement(makeUser("admin"))).toBe(true);
  });

  it("teacher NO puede emitir global", () => {
    expect(canEmitGlobalAnnouncement(makeUser("teacher"))).toBe(false);
  });

  it("student NO puede emitir global", () => {
    expect(canEmitGlobalAnnouncement(makeUser("student"))).toBe(false);
  });
});
