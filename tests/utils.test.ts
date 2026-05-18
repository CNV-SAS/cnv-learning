// Tests de utilities de lib/utils. Bloque 3 sub-bloque 3.4 establece
// el set para getInitials (avatar fallback). Casos canonical mas un
// par de edge cases que vimos al disenar la utility.

import { describe, it, expect } from "vitest";
import { getInitials } from "@/lib/utils/format";

describe("getInitials", () => {
  it("1 palabra: primera letra", () => {
    expect(getInitials("Santiago", "any@test.com")).toBe("S");
  });

  it("2 palabras: primera de la primera + primera de la ultima", () => {
    expect(getInitials("Santiago Uribe", "any@test.com")).toBe("SU");
  });

  it("3+ palabras: primera de la primera + primera de la ultima", () => {
    expect(getInitials("Santiago Uribe Arroyave", "any@test.com")).toBe("SA");
  });

  it("espacios extra: los ignora", () => {
    expect(getInitials("  Santiago  Uribe  ", "any@test.com")).toBe("SU");
  });

  it("name vacio: fallback a parte local del email", () => {
    expect(getInitials("", "sau@gmail.com")).toBe("S");
  });

  it("name null: fallback a parte local del email", () => {
    expect(getInitials(null, "sau@gmail.com")).toBe("S");
  });
});
