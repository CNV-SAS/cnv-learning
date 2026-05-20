// Tests de validaciones Zod del modulo profile (Bloque 16).

import { describe, it, expect } from "vitest";
import {
  updateProfileSchema,
  updateAvatarSchema,
  changePasswordSchema,
} from "@/modules/profile/validations";

describe("updateProfileSchema", () => {
  it("acepta input completo valido", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Juan Pérez García",
      bio: "Profesional con 10 años de experiencia.",
      professionalLicense: "TM-12345",
      institution: "Universidad Nacional",
      specialization: "Medicina interna",
    });
    expect(result.success).toBe(true);
  });

  it("acepta solo fullName (resto optional)", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Juan",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBeUndefined();
      expect(result.data.professionalLicense).toBeUndefined();
    }
  });

  it("normaliza optionals vacios a undefined", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Juan",
      bio: "   ",
      institution: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBeUndefined();
      expect(result.data.institution).toBeUndefined();
    }
  });

  it("rechaza fullName < 3 chars", () => {
    const result = updateProfileSchema.safeParse({ fullName: "ab" });
    expect(result.success).toBe(false);
  });

  it("rechaza fullName > 200 chars", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza bio > 1000 chars", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Juan",
      bio: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAvatarSchema", () => {
  it("acepta HTTPS URL valida", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl:
        "https://abc.supabase.co/storage/v1/object/public/avatars/uid/file.png",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza HTTP (no HTTPS)", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: "http://example.com/avatar.png",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza string no-URL", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: "no-soy-url",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza URL muy larga (> 2048)", () => {
    const result = updateAvatarSchema.safeParse({
      avatarUrl: "https://x.com/" + "a".repeat(2040),
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("acepta input valido (current + new + match confirm)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "newPass456",
      confirmPassword: "newPass456",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza si newPassword no cumple politica (< 8)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "ab12",
      confirmPassword: "ab12",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza si newPassword sin digitos", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "soloLetras",
      confirmPassword: "soloLetras",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza si newPassword sin letras", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza si confirmPassword no coincide", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "current123",
      newPassword: "newPass456",
      confirmPassword: "newPass457",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza si newPassword == currentPassword (refine)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "samePass123",
      newPassword: "samePass123",
      confirmPassword: "samePass123",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza currentPassword vacio", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newPass456",
      confirmPassword: "newPass456",
    });
    expect(result.success).toBe(false);
  });
});
