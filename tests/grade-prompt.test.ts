// Tests del prompt puro grade.v1. Verifica que incluya los campos
// del dominio en el texto + las ramas por tipo (essay con texto,
// file_upload sin acceso al archivo, entrega vacia).

import { describe, it, expect } from "vitest";
import { gradePromptV1 } from "@/modules/assignments/ai/prompts/grade.v1";
import type {
  Assignment,
  Submission,
} from "@/modules/assignments/types";

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "00000000-0000-0000-0000-000000000400",
    module_id: "00000000-0000-0000-0000-000000000100",
    title: "Ensayo final",
    description: "Reflexiona sobre la lección 1.",
    type: "essay",
    due_at: null,
    max_score: 100,
    is_required: true,
    created_at: "2026-05-18T00:00:00Z",
    updated_at: "2026-05-18T00:00:00Z",
    ...overrides,
  } as Assignment;
}

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "00000000-0000-0000-0000-000000000500",
    assignment_id: "00000000-0000-0000-0000-000000000400",
    user_id: "00000000-0000-0000-0000-000000000003",
    status: "submitted",
    storage_path: null,
    essay_text: null,
    quiz_answers: null,
    submitted_at: "2026-05-18T00:00:00Z",
    created_at: "2026-05-18T00:00:00Z",
    updated_at: "2026-05-18T00:00:00Z",
    ...overrides,
  } as Submission;
}

describe("gradePromptV1", () => {
  it("incluye titulo, descripcion y max_score del assignment", () => {
    const prompt = gradePromptV1({
      assignment: makeAssignment(),
      submission: makeSubmission({ essay_text: "Mi reflexión." }),
    });
    expect(prompt).toContain("Ensayo final");
    expect(prompt).toContain("Reflexiona sobre la lección 1.");
    expect(prompt).toContain("100");
  });

  it("essay con essay_text: incluye el texto del estudiante", () => {
    const prompt = gradePromptV1({
      assignment: makeAssignment({ type: "essay" }),
      submission: makeSubmission({
        essay_text: "Aprendí sobre bioimpedancia y su aplicación clínica.",
      }),
    });
    expect(prompt).toContain(
      "Aprendí sobre bioimpedancia y su aplicación clínica.",
    );
    expect(prompt).toContain("RESPUESTA DEL ESTUDIANTE");
  });

  it("file_upload: indica que la IA no tiene acceso al archivo", () => {
    const prompt = gradePromptV1({
      assignment: makeAssignment({ type: "file_upload" }),
      submission: makeSubmission({
        storage_path: "user-id/assignment-id/1234-mi-ensayo.pdf",
      }),
    });
    expect(prompt).toContain("mi-ensayo.pdf");
    expect(prompt).toContain("NO tienes acceso al contenido del archivo");
    expect(prompt).toContain("revisar el archivo manualmente");
  });

  it("entrega vacia: indica que no hay contenido evaluable", () => {
    const prompt = gradePromptV1({
      assignment: makeAssignment({ type: "essay" }),
      submission: makeSubmission({ essay_text: null }),
    });
    expect(prompt).toContain("no incluyó contenido visible");
  });

  it("documenta el output JSON esperado", () => {
    const prompt = gradePromptV1({
      assignment: makeAssignment(),
      submission: makeSubmission({ essay_text: "x" }),
    });
    expect(prompt).toContain("suggestedGrade");
    expect(prompt).toContain("generatedFeedback");
    expect(prompt).toContain("JSON");
  });
});
