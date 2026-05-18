// Tests de policies del modulo auth. Bloque 3 sub-bloque 3.3
// establece el patron para todas las policies futuras: una funcion
// pura por test, una assertion por caso, factory minima de user.

import { describe, it, expect } from "vitest";
import { getNavigationFor } from "@/modules/auth/policies/navigation";
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
});
