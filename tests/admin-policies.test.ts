// Tests de policies de admin user management (Bloque 14).
// Patron context-based: el caller pre-resuelve isLastAdmin antes
// de invocar la policy. Cubre defensas anti-self y anti-lockout.

import { describe, it, expect } from "vitest";
import {
  canManageUsers,
  canChangeRole,
  canSuspendUser,
  canDeleteUser,
} from "@/modules/admin/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

const ADMIN_ID = "00000000-0000-0000-0000-0000000000aa";
const OTHER_ADMIN_ID = "00000000-0000-0000-0000-0000000000bb";
const TARGET_ID = "00000000-0000-0000-0000-0000000000cc";

function makeUser(role: UserRole, id: string = ADMIN_ID): AuthenticatedUser {
  return {
    id,
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
    avatar_url: null,
  };
}

describe("canManageUsers", () => {
  it("admin pasa", () => {
    expect(canManageUsers(makeUser("admin"))).toBe(true);
  });

  it("teacher NO pasa", () => {
    expect(canManageUsers(makeUser("teacher"))).toBe(false);
  });

  it("student NO pasa", () => {
    expect(canManageUsers(makeUser("student"))).toBe(false);
  });
});

describe("canChangeRole", () => {
  it("admin cambia rol de otro user", () => {
    expect(
      canChangeRole(makeUser("admin"), {
        targetUserId: TARGET_ID,
        newRole: "teacher",
        isLastAdmin: false,
      }),
    ).toBe(true);
  });

  it("admin NO cambia su propio rol (anti-self)", () => {
    expect(
      canChangeRole(makeUser("admin"), {
        targetUserId: ADMIN_ID,
        newRole: "teacher",
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("admin NO degrada al ultimo admin (anti-lockout)", () => {
    expect(
      canChangeRole(makeUser("admin"), {
        targetUserId: OTHER_ADMIN_ID,
        newRole: "teacher",
        isLastAdmin: true,
      }),
    ).toBe(false);
  });

  it("admin puede 'cambiar' al ultimo admin a admin (no-op semantico)", () => {
    expect(
      canChangeRole(makeUser("admin"), {
        targetUserId: OTHER_ADMIN_ID,
        newRole: "admin",
        isLastAdmin: true,
      }),
    ).toBe(true);
  });

  it("teacher NO cambia roles", () => {
    expect(
      canChangeRole(makeUser("teacher"), {
        targetUserId: TARGET_ID,
        newRole: "admin",
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("student NO cambia roles", () => {
    expect(
      canChangeRole(makeUser("student"), {
        targetUserId: TARGET_ID,
        newRole: "admin",
        isLastAdmin: false,
      }),
    ).toBe(false);
  });
});

describe("canSuspendUser", () => {
  it("admin suspende a otro user", () => {
    expect(
      canSuspendUser(makeUser("admin"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(true);
  });

  it("admin NO se suspende a si mismo (anti-self)", () => {
    expect(
      canSuspendUser(makeUser("admin"), {
        targetUserId: ADMIN_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("admin NO suspende al ultimo admin (anti-lockout)", () => {
    expect(
      canSuspendUser(makeUser("admin"), {
        targetUserId: OTHER_ADMIN_ID,
        isLastAdmin: true,
      }),
    ).toBe(false);
  });

  it("teacher NO suspende", () => {
    expect(
      canSuspendUser(makeUser("teacher"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("student NO suspende", () => {
    expect(
      canSuspendUser(makeUser("student"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });
});

describe("canDeleteUser", () => {
  it("admin elimina a otro user", () => {
    expect(
      canDeleteUser(makeUser("admin"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(true);
  });

  it("admin NO se elimina a si mismo (anti-self)", () => {
    expect(
      canDeleteUser(makeUser("admin"), {
        targetUserId: ADMIN_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("admin NO elimina al ultimo admin (anti-lockout)", () => {
    expect(
      canDeleteUser(makeUser("admin"), {
        targetUserId: OTHER_ADMIN_ID,
        isLastAdmin: true,
      }),
    ).toBe(false);
  });

  it("teacher NO elimina", () => {
    expect(
      canDeleteUser(makeUser("teacher"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });

  it("student NO elimina", () => {
    expect(
      canDeleteUser(makeUser("student"), {
        targetUserId: TARGET_ID,
        isLastAdmin: false,
      }),
    ).toBe(false);
  });
});
