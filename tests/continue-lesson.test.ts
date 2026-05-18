// Tests del helper puro pickFirstUncompleted. Cubre los flows del
// "continuar donde dejaste": ninguna completada, contigua,
// no-contigua, todas completadas, array vacio.

import { describe, it, expect } from "vitest";
import { pickFirstUncompleted } from "@/modules/progress/lib/pick-first-uncompleted";

const lessons = [
  { id: "l1" },
  { id: "l2" },
  { id: "l3" },
  { id: "l4" },
];

describe("pickFirstUncompleted", () => {
  it("ninguna completada: retorna la primera", () => {
    expect(pickFirstUncompleted(lessons, new Set())).toEqual({ id: "l1" });
  });

  it("primeras dos completadas: retorna la tercera", () => {
    expect(
      pickFirstUncompleted(lessons, new Set(["l1", "l2"])),
    ).toEqual({ id: "l3" });
  });

  it("todas completadas: retorna null", () => {
    expect(
      pickFirstUncompleted(lessons, new Set(["l1", "l2", "l3", "l4"])),
    ).toBeNull();
  });

  it("array de items vacio: retorna null", () => {
    expect(pickFirstUncompleted([], new Set(["l1"]))).toBeNull();
  });

  it("no-contigua: completada al medio, retorna la primera", () => {
    expect(pickFirstUncompleted(lessons, new Set(["l2"]))).toEqual({
      id: "l1",
    });
  });

  it("ultima completada: retorna la primera no completada", () => {
    expect(pickFirstUncompleted(lessons, new Set(["l4"]))).toEqual({
      id: "l1",
    });
  });
});
