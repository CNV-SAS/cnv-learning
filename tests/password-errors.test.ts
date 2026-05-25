// Tests del detector isSamePasswordError (Bloque 22.6). Cubre las
// dos formas en que Supabase Auth retorna el error de password
// reuse: AuthApiError.code = "same_password" (nuevo) y mensaje
// "should be different from the old password" (legacy).

import { describe, it, expect } from "vitest";
import { isSamePasswordError } from "@/modules/auth/utils/password-errors";

describe("isSamePasswordError", () => {
  it("detecta cuando code === 'same_password'", () => {
    expect(
      isSamePasswordError({
        code: "same_password",
        message: "Cualquier mensaje",
      }),
    ).toBe(true);
  });

  it("detecta cuando message contiene 'should be different from the old password'", () => {
    expect(
      isSamePasswordError({
        message:
          "New password should be different from the old password.",
      }),
    ).toBe(true);
  });

  it("detecta variantes de capitalizacion del mensaje", () => {
    expect(
      isSamePasswordError({
        message: "SHOULD BE DIFFERENT FROM THE OLD PASSWORD",
      }),
    ).toBe(true);
  });

  it("rechaza otros errores de auth (sesion expirada)", () => {
    expect(
      isSamePasswordError({
        code: "session_expired",
        message: "Session expired",
      }),
    ).toBe(false);
  });

  it("rechaza errores generales sin pista de reuse", () => {
    expect(
      isSamePasswordError({
        message: "Network error",
      }),
    ).toBe(false);
  });

  it("rechaza null/undefined sin throw", () => {
    expect(isSamePasswordError(null)).toBe(false);
    expect(isSamePasswordError(undefined)).toBe(false);
  });

  it("rechaza objeto vacio sin throw", () => {
    expect(isSamePasswordError({})).toBe(false);
  });
});
