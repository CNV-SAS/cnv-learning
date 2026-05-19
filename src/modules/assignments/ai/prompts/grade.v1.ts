// ============================================================
// Prompt: grade.v1
// Versión:        v1 (primera versión publicada)
// Fecha:          2026-05-18
// Modelo target:  configurable via GEMINI_MODEL (default
//                 gemini-2.5-flash) con responseMimeType JSON
// Output:         JSON estricto { suggestedGrade: number | null,
//                                generatedFeedback: string }
//                 suggestedGrade es null cuando el assignment es
//                 file_upload (la IA no lee archivos en MVP, no
//                 debe inventar nota).
//
// Cambios respecto a versiones anteriores: ninguna (primera).
//
// Regla dura 9 (ARCHITECTURE.md): los prompts viven versionados.
// Cuando se mejore el prompt:
//   1. Crear grade.v2.ts (NO modificar v1).
//   2. Cambiar GRADE_PROMPT_VERSION arriba en el dominio (o
//      exponer ambas versiones y elegir desde el service).
//   3. Las sugerencias historicas persistidas con prompt_version
//      = "grade.v1" siguen reproducibles consultando este archivo.
//
// Funcion pura: recibe submission + assignment, retorna string.
// Testeable sin mocks; tests en tests/grade-prompt.test.ts cubren
// las branches por type (essay / file_upload / sin contenido).
// ============================================================

import type { Assignment, Submission } from "@/modules/assignments/types";

export const GRADE_PROMPT_VERSION = "grade.v1";

interface GradePromptInput {
  submission: Submission;
  assignment: Assignment;
}

function describeSubmissionContent(
  submission: Submission,
  assignment: Assignment,
): string {
  if (assignment.type === "essay" && submission.essay_text) {
    return `RESPUESTA DEL ESTUDIANTE (texto completo):\n${submission.essay_text}`;
  }

  if (assignment.type === "file_upload" && submission.storage_path) {
    // El bucket es privado y NO extraemos texto del archivo en MVP.
    // El modelo solo recibe el nombre del archivo + descripcion de
    // la tarea. La sugerencia genera contexto pedagogico; el docente
    // debe abrir el archivo manualmente.
    const fileName =
      submission.storage_path.split("/").pop() ?? "archivo adjunto";
    return `El estudiante subió un archivo adjunto. El nombre del archivo es: "${fileName}". NO tienes acceso al contenido del archivo; solo conoces su nombre y la descripción de la tarea. Tu sugerencia debe basarse en la descripción de la tarea y debe advertir al docente que debe revisar el archivo manualmente antes de publicar la calificación.`;
  }

  return `El estudiante no incluyó contenido visible para evaluar (entrega vacía o no soportada).`;
}

export function gradePromptV1(input: GradePromptInput): string {
  const { submission, assignment } = input;
  const contentSection = describeSubmissionContent(submission, assignment);
  const isFileUpload = assignment.type === "file_upload";

  // Branch file_upload: prohibir nota numerica. Inventar nota sin
  // leer el archivo es peor que no dar nota (confunde al docente
  // que podria aplicarla sin pensar). La IA solo aporta feedback
  // orientativo + criterios derivados de la descripcion de la tarea.
  const gradeInstruction = isFileUpload
    ? `2. NO sugieras una calificación numérica. No tienes acceso al contenido del archivo y no puedes evaluar el trabajo. El valor de suggestedGrade DEBE ser exactamente null.`
    : `2. Sugiere una calificación numérica entre 0 y ${assignment.max_score}.`;

  const feedbackInstruction = isFileUpload
    ? `3. El feedback va dirigido al docente (no al estudiante). NO simules evaluación del archivo. En su lugar: lista criterios concretos que el docente debe verificar (basados en la descripción de la tarea) y recuérdale que debe abrir el archivo antes de publicar la calificación.`
    : `3. Escribe un feedback claro, constructivo y respetuoso, en español neutro, dirigido al estudiante (usa "tú"). El feedback debe explicar la calificación: qué hizo bien, qué puede mejorar.`;

  const outputGradeLine = isFileUpload
    ? `  "suggestedGrade": null,`
    : `  "suggestedGrade": <número entre 0 y ${assignment.max_score}>,`;

  return `Eres un asistente de calificación académica para CNV Learning. Tu tarea es ayudar al docente a calificar una entrega de un estudiante del Diplomado en Medicina Bioeléctrica.

CONTEXTO DE LA TAREA:
Título: ${assignment.title}
Descripción: ${assignment.description ?? "(sin descripción)"}
Puntaje máximo: ${assignment.max_score}

${contentSection}

INSTRUCCIONES:
1. Lee la entrega cuidadosamente.
${gradeInstruction}
${feedbackInstruction}
4. NO inventes información que no esté en la entrega ni en la descripción de la tarea.

OUTPUT: retorna un objeto JSON con exactamente esta estructura, sin texto adicional:
{
${outputGradeLine}
  "generatedFeedback": "<feedback en español, mínimo una oración>"
}`;
}
