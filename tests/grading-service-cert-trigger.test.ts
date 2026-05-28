// Tests del trigger de emision de constancia en gradingService.
// publishGrading (Bloque post-23 ISSUE 3 sub-bloque 4 + sub-8).
//
// Verifica que el trigger:
//   1. Se dispara cuando final_grade >= threshold AND is_required=true.
//   2. NO se dispara cuando final_grade < threshold (con is_required=true).
//   3. NO se dispara cuando is_required=false (cualquier nota).
//   4. Flow completo: submission -> grading -> cert emitida (verifica
//      que progressService.tryEmitCertificateForCourse recibe los
//      args correctos: userId y courseId).
//
// Boundary: mockeamos progressService.tryEmitCertificateForCourse
// para aislar la logica del trigger en grading.service. El metodo
// interno de progressService tiene sus propios tests (calculo de
// progreso ponderado, certificateService.kind logic).

import { describe, it, expect, vi, beforeEach } from "vitest";

const SUBMISSION_ID = "00000000-0000-0000-0000-000000000010";
const ASSIGNMENT_ID = "00000000-0000-0000-0000-000000000020";
const MODULE_ID = "00000000-0000-0000-0000-000000000030";
const COURSE_ID = "00000000-0000-0000-0000-000000000040";
const STUDENT_ID = "00000000-0000-0000-0000-000000000050";
const TEACHER_ID = "00000000-0000-0000-0000-000000000060";
const GRADING_ID = "00000000-0000-0000-0000-000000000070";

// Hoist mocks ANTES del import del service.
vi.mock("@/modules/assignments/data", () => ({
  assignmentRepository: { findById: vi.fn() },
  submissionRepository: { findById: vi.fn() },
  gradingRepository: {
    findBySubmissionId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/modules/audit/data", () => ({
  auditRepository: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/modules/courses/data/module.repository", () => ({
  moduleRepository: { findById: vi.fn() },
}));

vi.mock("@/modules/courses/data/course.repository", () => ({
  courseRepository: { findById: vi.fn() },
}));

vi.mock("@/modules/auth/data/profile.repository", () => ({
  profileRepository: { findById: vi.fn() },
}));

vi.mock("@/modules/progress/services/progress.service", () => ({
  progressService: {
    tryEmitCertificateForCourse: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/email", () => ({
  sendGradingPublishedEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/notifications/data", () => ({
  notificationRepository: { createBulk: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/core/logger/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// canGradeAssignment se importa desde policies; lo mockeamos a true
// para que el flow no aborte por authz en estos tests focales.
vi.mock("@/modules/assignments/policies", () => ({
  canGradeAssignment: vi.fn().mockReturnValue(true),
}));

import { gradingService } from "@/modules/assignments/services/grading.service";
import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import { moduleRepository } from "@/modules/courses/data/module.repository";
import { courseRepository } from "@/modules/courses/data/course.repository";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { progressService } from "@/modules/progress/services/progress.service";

interface SetupOpts {
  isRequired: boolean;
  passingGrade: number;
  maxScore: number;
}

function setupRepoMocks(opts: SetupOpts) {
  vi.mocked(submissionRepository.findById).mockResolvedValue({
    id: SUBMISSION_ID,
    assignment_id: ASSIGNMENT_ID,
    user_id: STUDENT_ID,
    status: "submitted",
    submitted_at: new Date("2026-05-20T10:00:00Z").toISOString(),
    essay_text: null,
    storage_path: null,
    storage_bucket: null,
    file_size_bytes: null,
    mime_type: null,
    attempt_number: 1,
    created_at: new Date("2026-05-20T10:00:00Z").toISOString(),
    updated_at: new Date("2026-05-20T10:00:00Z").toISOString(),
    // El cast a unknown -> Row evita listar campos no usados por el
    // service (RLS y triggers de la BD no se invocan aqui).
  } as unknown as Awaited<ReturnType<typeof submissionRepository.findById>>);

  vi.mocked(assignmentRepository.findById).mockResolvedValue({
    id: ASSIGNMENT_ID,
    module_id: MODULE_ID,
    title: "Caso clinico final",
    description: null,
    type: "file_upload",
    due_at: null,
    max_score: opts.maxScore,
    is_required: opts.isRequired,
    max_attempts: 0,
    position: 0,
    created_at: new Date("2026-04-01T10:00:00Z").toISOString(),
    updated_at: new Date("2026-04-01T10:00:00Z").toISOString(),
  } as unknown as Awaited<ReturnType<typeof assignmentRepository.findById>>);

  vi.mocked(gradingRepository.findBySubmissionId).mockResolvedValue(null);

  vi.mocked(gradingRepository.create).mockImplementation(
    async (input) =>
      ({
        id: GRADING_ID,
        submission_id: input.submission_id,
        graded_by: input.graded_by,
        final_grade: input.final_grade,
        feedback: input.feedback,
        ai_suggestion_id: input.ai_suggestion_id ?? null,
        graded_at: new Date("2026-05-21T10:00:00Z").toISOString(),
        created_at: new Date("2026-05-21T10:00:00Z").toISOString(),
        updated_at: new Date("2026-05-21T10:00:00Z").toISOString(),
      }) as unknown as Awaited<ReturnType<typeof gradingRepository.create>>,
  );

  vi.mocked(moduleRepository.findById).mockResolvedValue({
    id: MODULE_ID,
    course_id: COURSE_ID,
    title: "Modulo 1",
    description: null,
    position: 0,
    weight: 1,
    created_at: new Date("2026-04-01T10:00:00Z").toISOString(),
    updated_at: new Date("2026-04-01T10:00:00Z").toISOString(),
  } as unknown as Awaited<ReturnType<typeof moduleRepository.findById>>);

  vi.mocked(courseRepository.findById).mockResolvedValue({
    id: COURSE_ID,
    slug: "diplomado-mb",
    title: "Diplomado Medicina Bioeléctrica",
    description: null,
    cover_url: null,
    is_published: true,
    passing_grade: opts.passingGrade,
    created_by: TEACHER_ID,
    created_at: new Date("2026-04-01T10:00:00Z").toISOString(),
    updated_at: new Date("2026-04-01T10:00:00Z").toISOString(),
  } as unknown as Awaited<ReturnType<typeof courseRepository.findById>>);

  vi.mocked(profileRepository.findById).mockResolvedValue({
    id: STUDENT_ID,
    email: "alumno@cnvsystem.com",
    full_name: "Alumno Test",
    avatar_url: null,
    role: "student",
    created_at: new Date("2026-01-01T10:00:00Z").toISOString(),
    updated_at: new Date("2026-01-01T10:00:00Z").toISOString(),
  } as unknown as Awaited<ReturnType<typeof profileRepository.findById>>);
}

const TEACHER_USER = {
  id: TEACHER_ID,
  email: "docente@cnvsystem.com",
  role: "teacher",
  full_name: "Docente Test",
} as unknown as Parameters<typeof gradingService.publishGrading>[0]["user"];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gradingService.publishGrading - cert trigger (sub-bloque 4 + 8)", () => {
  it("DISPARA tryEmitCertificateForCourse cuando final_grade >= threshold AND is_required=true", async () => {
    setupRepoMocks({ isRequired: true, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 85,
      feedback: "Buen trabajo.",
    });

    expect(result.ok).toBe(true);
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledTimes(
      1,
    );
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledWith(
      STUDENT_ID,
      COURSE_ID,
    );
  });

  it("DISPARA cuando final_grade ES IGUAL al threshold exacto (boundary inclusiva)", async () => {
    // threshold = 70% de 100 = 70. final_grade = 70 -> passes(70, 70) = true.
    setupRepoMocks({ isRequired: true, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 70,
      feedback: "Justo lo necesario.",
    });

    expect(result.ok).toBe(true);
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledTimes(
      1,
    );
  });

  it("NO dispara cuando final_grade < threshold (is_required=true)", async () => {
    setupRepoMocks({ isRequired: true, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 60,
      feedback: "Necesitas mejorar.",
    });

    expect(result.ok).toBe(true);
    expect(
      progressService.tryEmitCertificateForCourse,
    ).not.toHaveBeenCalled();
  });

  it("NO dispara cuando is_required=false (aunque nota >= threshold)", async () => {
    setupRepoMocks({ isRequired: false, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 95,
      feedback: "Excelente, opcional.",
    });

    expect(result.ok).toBe(true);
    expect(
      progressService.tryEmitCertificateForCourse,
    ).not.toHaveBeenCalled();
  });

  it("NO dispara cuando is_required=false con nota debajo del threshold", async () => {
    setupRepoMocks({ isRequired: false, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 30,
      feedback: "Opcional, reprobada.",
    });

    expect(result.ok).toBe(true);
    expect(
      progressService.tryEmitCertificateForCourse,
    ).not.toHaveBeenCalled();
  });

  it("threshold respeta passing_grade y max_score variables del curso", async () => {
    // passing_grade=60, max_score=50 -> threshold = 30.
    // final_grade=30 -> passes(30, 30) = true.
    setupRepoMocks({ isRequired: true, passingGrade: 60, maxScore: 50 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 30,
      feedback: "Aprobaste el minimo.",
    });

    expect(result.ok).toBe(true);
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledTimes(
      1,
    );
  });

  it("threshold respeta passing_grade=0 (cualquier nota aprueba)", async () => {
    // passing_grade=0 -> threshold=0. final_grade=0 -> passes(0,0) = true.
    setupRepoMocks({ isRequired: true, passingGrade: 0, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 0,
      feedback: "Nota minima 0.",
    });

    expect(result.ok).toBe(true);
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledTimes(
      1,
    );
  });

  it("trigger es fault-tolerant: si tryEmit lanza, publishGrading retorna ok igual", async () => {
    // Defensa: el grading + audit ya estan persistidos. Un fallo en
    // la emision posterior NO debe degradar el resultado de la action.
    setupRepoMocks({ isRequired: true, passingGrade: 70, maxScore: 100 });
    vi.mocked(progressService.tryEmitCertificateForCourse).mockRejectedValue(
      new Error("simulated cert flow crash"),
    );

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 90,
      feedback: "ok",
    });

    expect(result.ok).toBe(true);
  });
});

describe("gradingService.publishGrading - flow completo (integration-style)", () => {
  it("submission -> grading -> trigger cert: orden, argumentos y persistencia", async () => {
    setupRepoMocks({ isRequired: true, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 88,
      feedback: "Cumple los criterios.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 1. Submission fue fetched.
    expect(submissionRepository.findById).toHaveBeenCalledWith(SUBMISSION_ID);

    // 2. Assignment fue fetched a partir del submission.
    expect(assignmentRepository.findById).toHaveBeenCalledWith(ASSIGNMENT_ID);

    // 3. Verificacion de grading previo.
    expect(gradingRepository.findBySubmissionId).toHaveBeenCalledWith(
      SUBMISSION_ID,
    );

    // 4. Grading persistido con los valores correctos.
    expect(gradingRepository.create).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(gradingRepository.create).mock.calls[0][0];
    expect(createCall.submission_id).toBe(SUBMISSION_ID);
    expect(createCall.graded_by).toBe(TEACHER_ID);
    expect(createCall.final_grade).toBe(88);
    expect(createCall.feedback).toBe("Cumple los criterios.");

    // 5. Module + course fueron resueltos para email/notif/trigger.
    expect(moduleRepository.findById).toHaveBeenCalledWith(MODULE_ID);
    expect(courseRepository.findById).toHaveBeenCalledWith(COURSE_ID);

    // 6. Trigger de cert se disparo al final con (studentId, courseId).
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledTimes(
      1,
    );
    expect(progressService.tryEmitCertificateForCourse).toHaveBeenCalledWith(
      STUDENT_ID,
      COURSE_ID,
    );

    // 7. El grading retornado es el creado.
    expect(result.value.id).toBe(GRADING_ID);
    expect(result.value.final_grade).toBe(88);
  });

  it("flow completo cuando assignment NO es obligatorio: persiste pero NO triggerea cert", async () => {
    setupRepoMocks({ isRequired: false, passingGrade: 70, maxScore: 100 });

    const result = await gradingService.publishGrading({
      user: TEACHER_USER,
      submissionId: SUBMISSION_ID,
      finalGrade: 100,
      feedback: "Tarea opcional aprobada.",
    });

    expect(result.ok).toBe(true);
    // El grading existe en BD.
    expect(gradingRepository.create).toHaveBeenCalledTimes(1);
    // Pero el trigger no se llamo (no afecta progreso del curso).
    expect(
      progressService.tryEmitCertificateForCourse,
    ).not.toHaveBeenCalled();
  });
});
