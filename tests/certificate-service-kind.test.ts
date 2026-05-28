// Test de certificateService.issueCertificate kind logic (Bloque
// post-23). Verifica que:
//   - Si NO existe completion valida previa -> emite kind='completion'.
//   - Si EXISTE completion valida previa -> emite kind='update'.
//   - Si curso NO esta al 100% -> rechaza con CERTIFICATE_NOT_ELIGIBLE.
//
// Mock manual de repos para evitar BD real. Verifica el shape del
// input que llega al create.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks ANTES del import del service.
vi.mock("@/modules/certificates/data", () => ({
  certificateRepository: {
    findValidCompletionByUserAndCourse: vi.fn(),
    create: vi.fn(),
    findByUserAndCourse: vi.fn(),
    findById: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock("@/modules/audit/data", () => ({
  auditRepository: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/modules/notifications/data", () => ({
  notificationRepository: { createBulk: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/modules/auth/data/profile.repository", () => ({
  profileRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/modules/courses/data", () => ({
  courseRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/email", () => ({
  sendCertificateIssuedEmail: vi.fn().mockResolvedValue(undefined),
  sendCertificateRevokedEmail: vi.fn().mockResolvedValue(undefined),
}));

// El logger es importable pero no necesita mock real.
vi.mock("@/core/logger/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Importamos despues de los mocks.
import { certificateService } from "@/modules/certificates/services";
import { certificateRepository } from "@/modules/certificates/data";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const COURSE_ID = "00000000-0000-0000-0000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("certificateService.issueCertificate kind logic", () => {
  it("emite kind='completion' cuando NO existe completion valida previa", async () => {
    vi.mocked(
      certificateRepository.findValidCompletionByUserAndCourse,
    ).mockResolvedValue(null);
    vi.mocked(certificateRepository.create).mockResolvedValue({
      id: "cert-new",
      user_id: USER_ID,
      course_id: COURSE_ID,
      issued_at: new Date().toISOString(),
      hash: "h",
      template_version: "v1",
      status: "valid",
      kind: "completion",
      revoked_at: null,
      revoked_by: null,
      revoked_reason: null,
    });

    const result = await certificateService.issueCertificate({
      userId: USER_ID,
      courseId: COURSE_ID,
      isCourseComplete: true,
    });

    expect(result.ok).toBe(true);
    expect(
      vi.mocked(certificateRepository.create).mock.calls[0][0].kind,
    ).toBe("completion");
  });

  it("emite kind='update' cuando ya existe completion valida previa", async () => {
    vi.mocked(
      certificateRepository.findValidCompletionByUserAndCourse,
    ).mockResolvedValue({
      id: "cert-existing-completion",
      user_id: USER_ID,
      course_id: COURSE_ID,
      issued_at: new Date("2026-01-01").toISOString(),
      hash: "h-old",
      template_version: "v1",
      status: "valid",
      kind: "completion",
      revoked_at: null,
      revoked_by: null,
      revoked_reason: null,
    });
    vi.mocked(certificateRepository.create).mockResolvedValue({
      id: "cert-update",
      user_id: USER_ID,
      course_id: COURSE_ID,
      issued_at: new Date().toISOString(),
      hash: "h-update",
      template_version: "v1",
      status: "valid",
      kind: "update",
      revoked_at: null,
      revoked_by: null,
      revoked_reason: null,
    });

    const result = await certificateService.issueCertificate({
      userId: USER_ID,
      courseId: COURSE_ID,
      isCourseComplete: true,
    });

    expect(result.ok).toBe(true);
    expect(
      vi.mocked(certificateRepository.create).mock.calls[0][0].kind,
    ).toBe("update");
  });

  it("rechaza con CERTIFICATE_NOT_ELIGIBLE cuando curso no esta 100%", async () => {
    const result = await certificateService.issueCertificate({
      userId: USER_ID,
      courseId: COURSE_ID,
      isCourseComplete: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CERTIFICATE_NOT_ELIGIBLE");
    }
    expect(certificateRepository.create).not.toHaveBeenCalled();
  });
});
