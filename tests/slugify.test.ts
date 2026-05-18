// Tests del helper puro slugify. Cubre acentos, espacios,
// caracteres especiales, vacio, y bordes inicial/final con dashes.

import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("texto simple en lowercase con dashes", () => {
    expect(slugify("Hola Mundo")).toBe("hola-mundo");
  });

  it("strip de acentos", () => {
    expect(slugify("Héctor González")).toBe("hector-gonzalez");
  });

  it("acentos en otras vocales", () => {
    expect(slugify("Cañón núñez")).toBe("canon-nunez");
  });

  it("caracteres especiales -> dash", () => {
    expect(slugify("Mi Tarea (versión 2)")).toBe("mi-tarea-version-2");
  });

  it("trim de espacios y dashes inicial/final", () => {
    expect(slugify("  espacios  ")).toBe("espacios");
  });

  it("multiples especiales seguidos colapsan en un dash", () => {
    expect(slugify("foo!!!bar")).toBe("foo-bar");
  });

  it("solo especiales: cadena vacia", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("vacio: cadena vacia", () => {
    expect(slugify("")).toBe("");
  });

  it("numeros se preservan", () => {
    expect(slugify("Año 2026 Q1")).toBe("ano-2026-q1");
  });
});
