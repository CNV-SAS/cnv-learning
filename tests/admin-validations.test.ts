// Tests de validaciones Zod del modulo admin (Bloque 14).

import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateRoleSchema,
  updateUserNameSchema,
  deleteUserSchema,
  suspendUserSchema,
  unsuspendUserSchema,
  sendPasswordResetSchema,
  createEnrollmentSchema,
  cancelEnrollmentSchema,
  assignTeacherToCourseSchema,
  removeTeacherFromCourseSchema,
} from "@/modules/admin/validations";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("createUserSchema", () => {
  it("acepta input valido", () => {
    const result = createUserSchema.safeParse({
      email: "alumno@example.com",
      fullName: "Juan Pérez",
      role: "student",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza email a lowercase + trim", () => {
    const result = createUserSchema.safeParse({
      email: "  ALUMNO@example.com  ",
      fullName: "Juan",
      role: "student",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("alumno@example.com");
    }
  });

  it("rechaza email invalido", () => {
    const result = createUserSchema.safeParse({
      email: "no-es-email",
      fullName: "Juan",
      role: "student",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre muy corto", () => {
    const result = createUserSchema.safeParse({
      email: "x@y.com",
      fullName: "ab",
      role: "student",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre solo digitos (S1.2)", () => {
    const result = createUserSchema.safeParse({
      email: "x@y.com",
      fullName: "123456",
      role: "student",
    });
    expect(result.success).toBe(false);
  });

  it("acepta nombre con digitos si tiene al menos una letra (S1.2)", () => {
    const result = createUserSchema.safeParse({
      email: "x@y.com",
      fullName: "Juan Pablo II",
      role: "student",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza rol invalido", () => {
    const result = createUserSchema.safeParse({
      email: "x@y.com",
      fullName: "Juan",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("acepta UUID + rol valido", () => {
    const result = updateRoleSchema.safeParse({
      userId: VALID_UUID,
      role: "teacher",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza UUID malformado", () => {
    const result = updateRoleSchema.safeParse({
      userId: "not-a-uuid",
      role: "teacher",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserNameSchema (Bloque 22.15)", () => {
  it("acepta UUID + nombre valido", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "Juan Pérez García",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza UUID malformado", () => {
    const result = updateUserNameSchema.safeParse({
      userId: "not-a-uuid",
      fullName: "Juan Pérez",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre < 3 chars", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre > 40 chars (cap del PDF)", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "x".repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it("acepta el nombre de prueba documentado (38 chars)", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "Santiago Del Carmen Restrepo Arroyaves",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre solo digitos (regex \\p{L})", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("acepta nombre con digitos si tiene letra", () => {
    const result = updateUserNameSchema.safeParse({
      userId: VALID_UUID,
      fullName: "Juan Pablo II",
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteUserSchema", () => {
  it("acepta UUID + confirmEmail valido", () => {
    const result = deleteUserSchema.safeParse({
      userId: VALID_UUID,
      confirmEmail: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza confirmEmail (lowercase + trim)", () => {
    const result = deleteUserSchema.safeParse({
      userId: VALID_UUID,
      confirmEmail: "  USER@example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confirmEmail).toBe("user@example.com");
    }
  });

  it("rechaza confirmEmail invalido", () => {
    const result = deleteUserSchema.safeParse({
      userId: VALID_UUID,
      confirmEmail: "no-es-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("suspendUserSchema", () => {
  it("acepta motivo valido (3-500 chars)", () => {
    const result = suspendUserSchema.safeParse({
      userId: VALID_UUID,
      reason: "Cuenta inactiva.",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza motivo muy corto", () => {
    const result = suspendUserSchema.safeParse({
      userId: VALID_UUID,
      reason: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza motivo > 500 chars", () => {
    const result = suspendUserSchema.safeParse({
      userId: VALID_UUID,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("unsuspendUserSchema", () => {
  it("acepta solo UUID", () => {
    const result = unsuspendUserSchema.safeParse({ userId: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe("sendPasswordResetSchema", () => {
  it("acepta solo UUID", () => {
    const result = sendPasswordResetSchema.safeParse({ userId: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

describe("createEnrollmentSchema", () => {
  it("acepta userId + courseId UUIDs", () => {
    const result = createEnrollmentSchema.safeParse({
      userId: VALID_UUID,
      courseId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza courseId malformado", () => {
    const result = createEnrollmentSchema.safeParse({
      userId: VALID_UUID,
      courseId: "not-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelEnrollmentSchema", () => {
  it("acepta enrollmentId UUID", () => {
    const result = cancelEnrollmentSchema.safeParse({
      enrollmentId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza enrollmentId malformado", () => {
    const result = cancelEnrollmentSchema.safeParse({
      enrollmentId: "abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignTeacherToCourseSchema", () => {
  it("acepta teacherUserId + courseId UUIDs", () => {
    const result = assignTeacherToCourseSchema.safeParse({
      teacherUserId: VALID_UUID,
      courseId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza teacherUserId malformado", () => {
    const result = assignTeacherToCourseSchema.safeParse({
      teacherUserId: "abc",
      courseId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});

describe("removeTeacherFromCourseSchema", () => {
  it("acepta par UUIDs valido", () => {
    const result = removeTeacherFromCourseSchema.safeParse({
      teacherUserId: VALID_UUID,
      courseId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza courseId malformado", () => {
    const result = removeTeacherFromCourseSchema.safeParse({
      teacherUserId: VALID_UUID,
      courseId: "not-uuid",
    });
    expect(result.success).toBe(false);
  });
});
