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

// Bloque 23.2.b: row del editor agrupando pregunta + sus opciones
// completas (incluye is_correct, que el teacher SI puede ver via las
// policies de 0017 + 0033).
export interface QuestionWithOptions {
  question: QuizQuestion;
  options: QuizOption[];
}

// Input shape para crear/replace opciones desde el editor. El repo
// genera ids server-side; la posicion la fija el editor.
export interface QuizOptionInput {
  label: string;
  is_correct: boolean;
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

  // ============================================================
  // Bloque 23.2.b: metodos para el editor de quiz (teacher/admin).
  //
  // Uso server client porque las policies "Teachers/Admins manage
  // quiz_questions/options" (0017 + 0033) dan SELECT/INSERT/UPDATE/
  // DELETE al teacher de su curso y al admin. Defense-in-depth con
  // la policy TS canEditCourseContent del service.
  // ============================================================

  async findQuestionById(
    questionId: string,
  ): Promise<QuizQuestion | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Lista preguntas con sus opciones (con is_correct) para el editor.
  // 2 queries: questions + options con .in(). N+1 controlado: <20
  // preguntas por quiz, 1 query batch para options.
  async listQuestionsWithOptionsForEditor(
    assignmentId: string,
  ): Promise<QuestionWithOptions[]> {
    const supabase = await createClient();

    const { data: questions, error: qError } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("position", { ascending: true });
    if (qError) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, qError.message);
    }
    if (!questions || questions.length === 0) return [];

    const { data: options, error: oError } = await supabase
      .from("quiz_options")
      .select("*")
      .in(
        "question_id",
        questions.map((q) => q.id),
      )
      .order("position", { ascending: true });
    if (oError) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, oError.message);
    }

    const byQuestion = new Map<string, QuizOption[]>();
    for (const opt of options ?? []) {
      const arr = byQuestion.get(opt.question_id) ?? [];
      arr.push(opt);
      byQuestion.set(opt.question_id, arr);
    }

    return questions.map((q) => ({
      question: q,
      options: byQuestion.get(q.id) ?? [],
    }));
  },

  // Mayor position de quiz_questions del assignment. null si vacio.
  // Usado por createQuestionWithOptions para asignar la position
  // siguiente (max + 1) al final de la lista.
  async maxQuestionPosition(
    assignmentId: string,
  ): Promise<number | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("position")
      .eq("assignment_id", assignmentId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.position ?? null;
  },

  // Crea question + opciones en 2 statements separados (Supabase no
  // expone transacciones cross-table desde JS). Si el segundo falla,
  // la question queda sin opciones; el service detecta y borra para
  // recuperar a estado limpio.
  async createQuestionWithOptions(input: {
    assignmentId: string;
    prompt: string;
    points: number;
    position: number;
    options: QuizOptionInput[];
  }): Promise<QuestionWithOptions> {
    const supabase = await createClient();

    const { data: question, error: qError } = await supabase
      .from("quiz_questions")
      .insert({
        assignment_id: input.assignmentId,
        prompt: input.prompt,
        points: input.points,
        position: input.position,
      })
      .select("*")
      .single();
    if (qError || !question) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        qError?.message ?? "No se pudo crear la pregunta",
      );
    }

    const optionRows = input.options.map((o) => ({
      question_id: question.id,
      label: o.label,
      is_correct: o.is_correct,
      position: o.position,
    }));
    const { data: options, error: oError } = await supabase
      .from("quiz_options")
      .insert(optionRows)
      .select("*");
    if (oError || !options) {
      // Rollback manual de la question huerfana.
      await supabase.from("quiz_questions").delete().eq("id", question.id);
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        oError?.message ?? "No se pudieron crear las opciones",
      );
    }

    return { question, options };
  },

  async updateQuestion(input: {
    questionId: string;
    prompt: string;
    points: number;
  }): Promise<QuizQuestion> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quiz_questions")
      .update({ prompt: input.prompt, points: input.points })
      .eq("id", input.questionId)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo actualizar la pregunta",
      );
    }
    return data;
  },

  // Reemplaza el set completo de opciones de una pregunta (delete
  // all + insert new). Usado cuando el teacher edita opciones: el
  // editor envia el set completo; los ids previos se descartan.
  async replaceOptions(input: {
    questionId: string;
    options: QuizOptionInput[];
  }): Promise<QuizOption[]> {
    const supabase = await createClient();

    const { error: dError } = await supabase
      .from("quiz_options")
      .delete()
      .eq("question_id", input.questionId);
    if (dError) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, dError.message);
    }

    const rows = input.options.map((o) => ({
      question_id: input.questionId,
      label: o.label,
      is_correct: o.is_correct,
      position: o.position,
    }));
    const { data, error } = await supabase
      .from("quiz_options")
      .insert(rows)
      .select("*");
    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudieron reemplazar las opciones",
      );
    }
    return data;
  },

  async deleteQuestion(questionId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", questionId);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // RPC swap_quiz_question_positions (migracion 0033). Atomic swap
  // del unique (assignment_id, position) via sentinel -1.
  async swapQuestionPositions(input: {
    assignmentId: string;
    posA: number;
    posB: number;
  }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("swap_quiz_question_positions", {
      p_assignment_id: input.assignmentId,
      p_pos_a: input.posA,
      p_pos_b: input.posB,
    });
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
