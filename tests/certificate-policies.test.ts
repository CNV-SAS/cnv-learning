// Tests de policies de certificates. Patron context-based: el
// caller pre-resuelve el contexto (course complete, has previous,
// owner, etc.) y la policy es pura sync.

import { describe, it, expect } from "vitest";
import {
  canIssueCertificate,
  canRevokeCertificate,
  canViewCertificatePdf,
  canViewCorporateCertificatePdf,
} from "@/modules/certificates/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

const OWNER_ID = "00000000-0000-0000-0000-0000000000aa";
const OTHER_ID = "00000000-0000-0000-0000-0000000000bb";

function makeUser(role: UserRole, id: string = OWNER_ID): AuthenticatedUser {
  return {
    id,
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
    avatar_url: null,
  };
}

describe("canIssueCertificate (Bloque post-23 refactor)", () => {
  // Post-23: el guard de duplicados ya no es responsabilidad de la
  // policy (ahora vive en findValidCompletionByUserAndCourse + partial
  // unique index del schema). La policy solo evalua isCourseComplete.

  it("permite cuando curso 100%", () => {
    expect(
      canIssueCertificate({
        isCourseComplete: true,
      }),
    ).toBe(true);
  });

  it("rechaza cuando curso no esta 100%", () => {
    expect(
      canIssueCertificate({
        isCourseComplete: false,
      }),
    ).toBe(false);
  });
});

describe("canRevokeCertificate", () => {
  it("admin revoca cert valido", () => {
    expect(
      canRevokeCertificate(makeUser("admin"), {
        certificateExists: true,
        alreadyRevoked: false,
      }),
    ).toBe(true);
  });

  it("admin NO revoca cert ya revocado", () => {
    expect(
      canRevokeCertificate(makeUser("admin"), {
        certificateExists: true,
        alreadyRevoked: true,
      }),
    ).toBe(false);
  });

  it("admin NO revoca cert inexistente", () => {
    expect(
      canRevokeCertificate(makeUser("admin"), {
        certificateExists: false,
        alreadyRevoked: false,
      }),
    ).toBe(false);
  });

  it("teacher NO revoca certs", () => {
    expect(
      canRevokeCertificate(makeUser("teacher"), {
        certificateExists: true,
        alreadyRevoked: false,
      }),
    ).toBe(false);
  });

  it("student NO revoca certs (ni el propio)", () => {
    expect(
      canRevokeCertificate(makeUser("student"), {
        certificateExists: true,
        alreadyRevoked: false,
      }),
    ).toBe(false);
  });
});

describe("canViewCertificatePdf", () => {
  it("student propietario ve su PDF", () => {
    expect(
      canViewCertificatePdf(makeUser("student", OWNER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("student NO ve PDF ajeno", () => {
    expect(
      canViewCertificatePdf(makeUser("student", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("admin ve cualquier PDF", () => {
    expect(
      canViewCertificatePdf(makeUser("admin", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("teacher NO ve PDF (no aplica en MVP)", () => {
    expect(
      canViewCertificatePdf(makeUser("teacher", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("nadie ve PDF de cert inexistente", () => {
    expect(
      canViewCertificatePdf(makeUser("admin"), {
        certificateExists: false,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });
});

describe("canViewCorporateCertificatePdf (Bloque 22.4)", () => {
  it("student propietario ve su PDF corporativo", () => {
    expect(
      canViewCorporateCertificatePdf(makeUser("student", OWNER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("student NO ve PDF corporativo ajeno", () => {
    expect(
      canViewCorporateCertificatePdf(makeUser("student", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("admin ve cualquier PDF corporativo", () => {
    expect(
      canViewCorporateCertificatePdf(makeUser("admin", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("teacher NO ve PDF corporativo", () => {
    expect(
      canViewCorporateCertificatePdf(makeUser("teacher", OTHER_ID), {
        certificateExists: true,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("nadie ve PDF corporativo de cert inexistente", () => {
    expect(
      canViewCorporateCertificatePdf(makeUser("admin"), {
        certificateExists: false,
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });
});
