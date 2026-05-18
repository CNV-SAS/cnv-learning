// Tests del helper puro findNeighbors (lesson-navigation service).
// El service async que orquesta moduleRepository + lessonRepository
// no se testea aqui (requeriria mocks de Supabase server client);
// la logica esencial vive en findNeighbors y es donde estan los
// edge cases.

import { describe, it, expect } from "vitest";
import { findNeighbors } from "@/modules/courses/services/lesson-navigation";

const items = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
  { id: "d" },
];

describe("findNeighbors", () => {
  it("retorna prev y next correctos en medio", () => {
    expect(findNeighbors(items, "b")).toEqual({
      prev: { id: "a" },
      next: { id: "c" },
    });
  });

  it("prev null cuando el current es el primero", () => {
    expect(findNeighbors(items, "a")).toEqual({
      prev: null,
      next: { id: "b" },
    });
  });

  it("next null cuando el current es el ultimo", () => {
    expect(findNeighbors(items, "d")).toEqual({
      prev: { id: "c" },
      next: null,
    });
  });

  it("ambos null cuando no encuentra el id", () => {
    expect(findNeighbors(items, "zzz")).toEqual({
      prev: null,
      next: null,
    });
  });

  it("ambos null en array vacio", () => {
    expect(findNeighbors([], "a")).toEqual({ prev: null, next: null });
  });

  it("array de uno: ambos null (el current es unico)", () => {
    expect(findNeighbors([{ id: "a" }], "a")).toEqual({
      prev: null,
      next: null,
    });
  });
});
