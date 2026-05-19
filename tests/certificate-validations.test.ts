// Tests del schema Zod revokeCertificateSchema. UUID + razon
// con limites (3-500 chars, trim antes de validar).

import { describe, it, expect } from "vitest";
import { revokeCertificateSchema } from "@/modules/certificates/validations";

const validId = "00000000-0000-0000-0000-000000000001";

describe("revokeCertificateSchema", () => {
  it("acepta input valido", () => {
    const r = revokeCertificateSchema.safeParse({
      certificateId: validId,
      reason: "Inconsistencia detectada en datos académicos.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza certificateId no UUID", () => {
    const r = revokeCertificateSchema.safeParse({
      certificateId: "not-a-uuid",
      reason: "Motivo válido.",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza reason menor a 3 caracteres", () => {
    const r = revokeCertificateSchema.safeParse({
      certificateId: validId,
      reason: "ab",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza reason mayor a 500 caracteres", () => {
    const r = revokeCertificateSchema.safeParse({
      certificateId: validId,
      reason: "a".repeat(501),
    });
    expect(r.success).toBe(false);
  });

  it("aplica trim antes de validar longitud", () => {
    const r = revokeCertificateSchema.safeParse({
      certificateId: validId,
      reason: "   ab   ",
    });
    expect(r.success).toBe(false);
  });
});
