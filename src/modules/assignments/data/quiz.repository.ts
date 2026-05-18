// Repositorio de quiz_questions + quiz_options. Manejo especial
// para el campo secreto `is_correct` de quiz_options (DATABASE.md
// lineas 805-826):
//
//   - quiz_options NO tiene policy SELECT para students. Cualquier
//     query desde server client de students devuelve cero filas.
//   - is_correct es la respuesta correcta del quiz; exponerla
//     trivializa el examen.
//   - El player consume opciones SIN is_correct (label + position).
//   - El grader (route handler /submit) lee is_correct server-side,
//     evalua las respuestas, y NUNCA envia is_correct al cliente.
//
// Por eso este repo expone 3 metodos:
//   - listQuestionsForAssignment: server client, RLS aplica (los
//     students con enrollment pueden leer questions).
//   - listOptionsForPlayer: admin client + select sin is_correct.
//     Bypass RLS justificado porque students no tienen SELECT.
//   - listOptionsForGrading: admin client + select con is_correct.
//     SOLO invocada server-side por quiz.service.submitQuiz; el
//     valor no debe llegar al cliente.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { QuizOption, QuizQuestion } from "../types";

// Subset publico de QuizOption (sin is_correct) para el payload
// que el player recibe en /api/quizzes/[id]/play.
export interface QuizOptionPublic {
  id: string;
  question_id: string;
  label: string;
  position: number;
}

export const quizRepository = {
  async listQuestionsForAssignment(
    assignmentId: string,
  ): Promise<QuizQuestion[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("position", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // BYPASS DE RLS: students no tienen SELECT en quiz_options
  // (DATABASE.md). Select explicito omite is_correct para que
  // el campo no entre al payload server-side accidentalmente.
  async listOptionsForPlayer(
    questionIds: string[],
  ): Promise<QuizOptionPublic[]> {
    if (questionIds.length === 0) return [];
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quiz_options")
      .select("id, question_id, label, position")
      .in("question_id", questionIds)
      .order("position", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // BYPASS DE RLS: solo invocada por quiz.service.submitQuiz para
  // calificar server-side. is_correct nunca llega al cliente.
  async listOptionsForGrading(
    questionIds: string[],
  ): Promise<QuizOption[]> {
    if (questionIds.length === 0) return [];
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quiz_options")
      .select("*")
      .in("question_id", questionIds);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
