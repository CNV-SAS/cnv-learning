// Tests de policies de profile (Bloque 16). Las policies son
// trivial true para los 3 roles autenticados; el listado exhaustivo
// del enum user_role hace evidente si en v2 entra un rol nuevo y
// alguien olvida actualizar la policy.

import { describe, it, expect } from "vitest";
import {
  canEditOwnProfile,
  canChangeOwnPassword,
} from "@/modules/profile/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
    avatar_url: null,
  };
}

describe("canEditOwnProfile", () => {
  it("student edita su propio perfil", () => {
    expect(canEditOwnProfile(makeUser("student"))).toBe(true);
  });

  it("teacher edita su propio perfil", () => {
    expect(canEditOwnProfile(makeUser("teacher"))).toBe(true);
  });

  it("admin edita su propio perfil", () => {
    expect(canEditOwnProfile(makeUser("admin"))).toBe(true);
  });
});

describe("canChangeOwnPassword", () => {
  it("student cambia su propia password", () => {
    expect(canChangeOwnPassword(makeUser("student"))).toBe(true);
  });

  it("teacher cambia su propia password", () => {
    expect(canChangeOwnPassword(makeUser("teacher"))).toBe(true);
  });

  it("admin cambia su propia password", () => {
    expect(canChangeOwnPassword(makeUser("admin"))).toBe(true);
  });
});
