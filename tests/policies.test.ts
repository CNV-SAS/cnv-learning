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
