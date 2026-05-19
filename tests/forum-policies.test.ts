// Tests de las policies del modulo forum. Mismo patron que
// policies.test.ts: factory minima de user, context-based.
//
// Cobertura:
//   - canPostInForum: roles validos posten cuando el foro existe;
//     ningun rol cuando no existe.
//   - canEditThread: autor edita; admin edita cualquiera; otro
//     student/teacher no edita.

import { describe, it, expect } from "vitest";
import {
  canPostInForum,
  canEditThread,
} from "@/modules/forum/policies";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

const AUTHOR_ID = "00000000-0000-0000-0000-0000000000aa";
const OTHER_ID = "00000000-0000-0000-0000-0000000000bb";

function makeUser(
  role: UserRole,
  id: string = "00000000-0000-0000-0000-000000000000",
): AuthenticatedUser {
  return {
    id,
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
  };
}

describe("canPostInForum", () => {
  it("student postea cuando el foro existe", () => {
    expect(
      canPostInForum(makeUser("student"), { forumExists: true }),
    ).toBe(true);
  });

  it("teacher postea cuando el foro existe", () => {
    expect(
      canPostInForum(makeUser("teacher"), { forumExists: true }),
    ).toBe(true);
  });

  it("admin postea cuando el foro existe", () => {
    expect(
      canPostInForum(makeUser("admin"), { forumExists: true }),
    ).toBe(true);
  });

  it("ningun rol postea cuando el foro no existe (RLS bloqueo)", () => {
    expect(
      canPostInForum(makeUser("student"), { forumExists: false }),
    ).toBe(false);
    expect(
      canPostInForum(makeUser("teacher"), { forumExists: false }),
    ).toBe(false);
    expect(
      canPostInForum(makeUser("admin"), { forumExists: false }),
    ).toBe(false);
  });
});

describe("canEditThread", () => {
  it("autor edita su propio thread", () => {
    expect(
      canEditThread(makeUser("student", AUTHOR_ID), {
        threadExists: true,
        authorId: AUTHOR_ID,
      }),
    ).toBe(true);
  });

  it("student NO edita thread de otro user", () => {
    expect(
      canEditThread(makeUser("student", OTHER_ID), {
        threadExists: true,
        authorId: AUTHOR_ID,
      }),
    ).toBe(false);
  });

  it("teacher NO edita thread de otro user (no es admin)", () => {
    expect(
      canEditThread(makeUser("teacher", OTHER_ID), {
        threadExists: true,
        authorId: AUTHOR_ID,
      }),
    ).toBe(false);
  });

  it("teacher edita su propio thread", () => {
    expect(
      canEditThread(makeUser("teacher", AUTHOR_ID), {
        threadExists: true,
        authorId: AUTHOR_ID,
      }),
    ).toBe(true);
  });

  it("admin edita cualquier thread", () => {
    expect(
      canEditThread(makeUser("admin", OTHER_ID), {
        threadExists: true,
        authorId: AUTHOR_ID,
      }),
    ).toBe(true);
  });

  it("nadie edita si el thread no existe", () => {
    expect(
      canEditThread(makeUser("admin", OTHER_ID), {
        threadExists: false,
        authorId: AUTHOR_ID,
      }),
    ).toBe(false);
    expect(
      canEditThread(makeUser("student", AUTHOR_ID), {
        threadExists: false,
        authorId: AUTHOR_ID,
      }),
    ).toBe(false);
  });
});
