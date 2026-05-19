// Tests de computeCertificateHash. Verifica:
//   - Determinismo: mismo input -> mismo hash (consideracion D del
//     plan B12).
//   - Sensibilidad a cualquier campo: cambiar 1 char en cualquier
//     parte cambia el hash.
//   - Formato: 64 chars hex (SHA-256 hex digest).

import { describe, it, expect } from "vitest";
import { computeCertificateHash } from "@/lib/utils/hash";

const BASE_INPUT = {
  userId: "00000000-0000-0000-0000-000000000001",
  courseId: "00000000-0000-0000-0000-000000000002",
  issuedAt: new Date("2026-05-19T12:00:00.000Z"),
  templateVersion: "v1",
};

describe("computeCertificateHash", () => {
  it("retorna 64 chars hex (SHA-256)", () => {
    const hash = computeCertificateHash(BASE_INPUT);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("es deterministico (mismo input -> mismo hash)", () => {
    const a = computeCertificateHash(BASE_INPUT);
    const b = computeCertificateHash(BASE_INPUT);
    expect(a).toBe(b);
  });

  it("cambia si userId cambia", () => {
    const a = computeCertificateHash(BASE_INPUT);
    const b = computeCertificateHash({
      ...BASE_INPUT,
      userId: "00000000-0000-0000-0000-000000000099",
    });
    expect(a).not.toBe(b);
  });

  it("cambia si courseId cambia", () => {
    const a = computeCertificateHash(BASE_INPUT);
    const b = computeCertificateHash({
      ...BASE_INPUT,
      courseId: "00000000-0000-0000-0000-000000000088",
    });
    expect(a).not.toBe(b);
  });

  it("cambia si issuedAt cambia (incluso 1 segundo)", () => {
    const a = computeCertificateHash(BASE_INPUT);
    const b = computeCertificateHash({
      ...BASE_INPUT,
      issuedAt: new Date("2026-05-19T12:00:01.000Z"),
    });
    expect(a).not.toBe(b);
  });

  it("cambia si templateVersion cambia", () => {
    const a = computeCertificateHash(BASE_INPUT);
    const b = computeCertificateHash({
      ...BASE_INPUT,
      templateVersion: "v2",
    });
    expect(a).not.toBe(b);
  });

  it("usa ISO UTC (mismo Date local y UTC dan mismo hash)", () => {
    // Una Date construida desde ISO con Z y otra Date que apunta
    // al mismo instante (a traves de getTime) deben dar el mismo
    // hash porque ambas serializan a la misma ISO UTC string.
    const t = new Date("2026-05-19T12:00:00.000Z").getTime();
    const a = computeCertificateHash({
      ...BASE_INPUT,
      issuedAt: new Date(t),
    });
    const b = computeCertificateHash({
      ...BASE_INPUT,
      issuedAt: new Date("2026-05-19T12:00:00.000Z"),
    });
    expect(a).toBe(b);
  });
});
