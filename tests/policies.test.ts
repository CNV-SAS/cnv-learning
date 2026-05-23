// Tests de policies. Bloque 3 sub-bloque 3.3 establece el patron
// (funcion pura por test, factory minima de user); Bloque 4 sub-bloque
// 4.2 lo extiende a las policies de courses con context resuelto por
// caller (defensa en profundidad documentada en can-view-course.ts).

import { describe, it, expect } from "vitest";
import { getNavigationFor } from "@/modules/auth/policies/navigation";
import { canAccessTeacherPanel } from "@/modules/auth/policies/can-access-teacher-panel";
import { canViewCourse } from "@/modules/courses/policies/can-view-course";
import { canViewLesson } from "@/modules/courses/policies/can-view-lesson";
import { canCompleteLesson } from "@/modules/courses/policies/can-complete-lesson";
import { canEditCourseContent } from "@/modules/courses/policies/can-edit-course-content";
import { canEditCourseResources } from "@/modules/courses/policies/can-edit-course-resources";
import { canSubmitAssignment } from "@/modules/assignments/policies/can-submit-assignment";
import { canGradeAssignment } from "@/modules/assignments/policies/can-grade-assignment";
import { canViewGrading } from "@/modules/assignments/policies/can-view-grading";
import { canViewSubmission } from "@/modules/assignments/policies/can-view-submission";
import type { AuthenticatedUser, UserRole } from "@/modules/auth/types";

function makeUser(role: UserRole): AuthenticatedUser {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "test@cnvsystem.com",
    full_name: "Test User",
    role,
    avatar_url: null,
  };
}

describe("getNavigationFor", () => {
  it("admin ve Dashboard + Admin + Perfil (sin Panel docente)", () => {
    const items = getNavigationFor(makeUser("admin"));
    expect(items.map((i) => i.href)).toEqual([
      "/dashboard",
      "/admin",
      "/profile",
    ]);
  });

  it("teacher ve Dashboard + Panel docente + Perfil (en ese orden)", () => {
    const items = getNavigationFor(makeUser("teacher"));
    expect(items.map((i) => i.href)).toEqual([
      "/dashboard",
      "/teacher",
      "/profile",
    ]);
    const teacherItem = items.find((i) => i.href === "/teacher");
    expect(teacherItem?.label).toBe("Panel docente");
  });

  it("student ve Dashboard + Perfil", () => {
    const items = getNavigationFor(makeUser("student"));
    expect(items.map((i) => i.href)).toEqual(["/dashboard", "/profile"]);
  });

  // Regresion del bug de sub-bloque 3.5: si NavItem se llenara con
  // referencias a componentes React (icon: LucideIcon), el array
  // dejaria de ser serializable y romperia al cruzar la frontera
  // Server -> Client. Verificamos via JSON roundtrip que el shape
  // se mantiene plain.
  it("items sobreviven JSON roundtrip (shape serializable)", () => {
    const items = getNavigationFor(makeUser("admin"));
    const cloned = JSON.parse(JSON.stringify(items));
    expect(cloned).toEqual(items);
  });
});

describe("canAccessTeacherPanel", () => {
  it("teacher pasa", () => {
    expect(canAccessTeacherPanel(makeUser("teacher"))).toBe(true);
  });

  it("admin NO pasa (strict tras refactor Bloque 14.1)", () => {
    expect(canAccessTeacherPanel(makeUser("admin"))).toBe(false);
  });

  it("student NO pasa", () => {
    expect(canAccessTeacherPanel(makeUser("student"))).toBe(false);
  });
});

describe("canViewCourse", () => {
  it("admin ve cualquier curso (incluso si RLS no lo retorna)", () => {
    expect(
      canViewCourse(makeUser("admin"), { courseExists: false }),
    ).toBe(true);
  });

  it("student ve curso cuando RLS lo retorna (enrolled)", () => {
    expect(
      canViewCourse(makeUser("student"), { courseExists: true }),
    ).toBe(true);
  });

  it("student no ve curso cuando RLS no lo retorna", () => {
    expect(
      canViewCourse(makeUser("student"), { courseExists: false }),
    ).toBe(false);
  });

  it("teacher ve curso cuando RLS lo retorna (assigned)", () => {
    expect(
      canViewCourse(makeUser("teacher"), { courseExists: true }),
    ).toBe(true);
  });

  it("teacher no ve curso cuando RLS no lo retorna", () => {
    expect(
      canViewCourse(makeUser("teacher"), { courseExists: false }),
    ).toBe(false);
  });
});

describe("canViewLesson", () => {
  it("admin ve cualquier leccion", () => {
    expect(
      canViewLesson(makeUser("admin"), { lessonExists: false }),
    ).toBe(true);
  });

  it("student ve leccion cuando RLS la retorna", () => {
    expect(
      canViewLesson(makeUser("student"), { lessonExists: true }),
    ).toBe(true);
  });

  it("student no ve leccion cuando RLS no la retorna", () => {
    expect(
      canViewLesson(makeUser("student"), { lessonExists: false }),
    ).toBe(false);
  });

  it("teacher ve leccion cuando RLS la retorna", () => {
    expect(
      canViewLesson(makeUser("teacher"), { lessonExists: true }),
    ).toBe(true);
  });

  it("teacher no ve leccion cuando RLS no la retorna", () => {
    expect(
      canViewLesson(makeUser("teacher"), { lessonExists: false }),
    ).toBe(false);
  });
});

describe("canCompleteLesson (S1.3)", () => {
  it("student completa cuando la leccion existe", () => {
    expect(
      canCompleteLesson(makeUser("student"), { lessonExists: true }),
    ).toBe(true);
  });

  it("student no completa si RLS bloqueo la leccion", () => {
    expect(
      canCompleteLesson(makeUser("student"), { lessonExists: false }),
    ).toBe(false);
  });

  it("admin NO completa (no registra progreso)", () => {
    expect(
      canCompleteLesson(makeUser("admin"), { lessonExists: true }),
    ).toBe(false);
  });

  it("teacher NO completa (no registra progreso)", () => {
    expect(
      canCompleteLesson(makeUser("teacher"), { lessonExists: true }),
    ).toBe(false);
  });
});

describe("canEditCourseContent (Bloque 19)", () => {
  it("admin edita cualquier curso que existe", () => {
    expect(
      canEditCourseContent(makeUser("admin"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(true);
  });

  it("admin NO edita curso inexistente (defense in depth)", () => {
    expect(
      canEditCourseContent(makeUser("admin"), {
        courseExists: false,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("teacher asignado edita el curso", () => {
    expect(
      canEditCourseContent(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher NO asignado NO edita (aunque el curso exista)", () => {
    expect(
      canEditCourseContent(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("student NO edita nunca", () => {
    expect(
      canEditCourseContent(makeUser("student"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });
});

describe("canEditCourseResources (Bloque 20)", () => {
  it("admin edita recursos de cualquier curso que existe", () => {
    expect(
      canEditCourseResources(makeUser("admin"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(true);
  });

  it("admin NO edita si el curso no existe (defense in depth)", () => {
    expect(
      canEditCourseResources(makeUser("admin"), {
        courseExists: false,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("teacher asignado edita recursos del curso", () => {
    expect(
      canEditCourseResources(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: true,
      }),
    ).toBe(true);
  });

  it("teacher NO asignado NO edita", () => {
    expect(
      canEditCourseResources(makeUser("teacher"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });

  it("student NO edita nunca", () => {
    expect(
      canEditCourseResources(makeUser("student"), {
        courseExists: true,
        isTeacherOfCourse: false,
      }),
    ).toBe(false);
  });
});

describe("canSubmitAssignment", () => {
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // -1 day

  it("student entrega cuando assignment existe y sin deadline", () => {
    expect(
      canSubmitAssignment(makeUser("student"), {
        assignmentExists: true,
        dueAt: null,
      }),
    ).toBe(true);
  });

  it("student entrega antes del deadline", () => {
    expect(
      canSubmitAssignment(makeUser("student"), {
        assignmentExists: true,
        dueAt: futureDate,
      }),
    ).toBe(true);
  });

  it("student no entrega despues del deadline", () => {
    expect(
      canSubmitAssignment(makeUser("student"), {
        assignmentExists: true,
        dueAt: pastDate,
      }),
    ).toBe(false);
  });

  it("student no entrega cuando assignment no existe (RLS bloqueo)", () => {
    expect(
      canSubmitAssignment(makeUser("student"), {
        assignmentExists: false,
        dueAt: null,
      }),
    ).toBe(false);
  });

  it("teacher no entrega tareas", () => {
    expect(
      canSubmitAssignment(makeUser("teacher"), {
        assignmentExists: true,
        dueAt: null,
      }),
    ).toBe(false);
  });

  it("admin no entrega tareas (no es estudiante)", () => {
    expect(
      canSubmitAssignment(makeUser("admin"), {
        assignmentExists: true,
        dueAt: null,
      }),
    ).toBe(false);
  });
});

describe("canGradeAssignment", () => {
  it("teacher califica cuando submission existe", () => {
    expect(
      canGradeAssignment(makeUser("teacher"), { submissionExists: true }),
    ).toBe(true);
  });

  it("teacher no califica si submission no existe (RLS bloqueo)", () => {
    expect(
      canGradeAssignment(makeUser("teacher"), { submissionExists: false }),
    ).toBe(false);
  });

  it("admin califica como backup", () => {
    expect(
      canGradeAssignment(makeUser("admin"), { submissionExists: true }),
    ).toBe(true);
  });

  it("student no califica", () => {
    expect(
      canGradeAssignment(makeUser("student"), { submissionExists: true }),
    ).toBe(false);
  });
});

describe("canViewGrading", () => {
  it("admin ve cualquier grading", () => {
    expect(
      canViewGrading(makeUser("admin"), { gradingExists: false }),
    ).toBe(true);
  });

  it("student ve grading cuando RLS la retorna (own submission)", () => {
    expect(
      canViewGrading(makeUser("student"), { gradingExists: true }),
    ).toBe(true);
  });

  it("student no ve grading de otros (RLS bloqueo)", () => {
    expect(
      canViewGrading(makeUser("student"), { gradingExists: false }),
    ).toBe(false);
  });
});

describe("canViewSubmission", () => {
  it("admin ve cualquier submission", () => {
    expect(
      canViewSubmission(makeUser("admin"), { submissionExists: false }),
    ).toBe(true);
  });

  it("teacher ve submission cuando RLS la retorna (curso suyo)", () => {
    expect(
      canViewSubmission(makeUser("teacher"), { submissionExists: true }),
    ).toBe(true);
  });

  it("student ve own submission cuando RLS la retorna", () => {
    expect(
      canViewSubmission(makeUser("student"), { submissionExists: true }),
    ).toBe(true);
  });

  it("student no ve submission de otros (RLS bloqueo)", () => {
    expect(
      canViewSubmission(makeUser("student"), { submissionExists: false }),
    ).toBe(false);
  });
});
