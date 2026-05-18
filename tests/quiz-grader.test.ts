// Tests del helper puro gradeQuiz. Cubre todos los flows: todas
// correctas, todas incorrectas, mezcla, pregunta sin respuesta,
// quiz vacio, option-id inexistente, cross-question (option de
// otra pregunta).

import { describe, it, expect } from "vitest";
import { gradeQuiz } from "@/modules/assignments/lib/quiz-grader";

const questions = [
  { id: "q1", points: 2 },
  { id: "q2", points: 3 },
  { id: "q3", points: 1 },
];

const options = [
  { id: "q1a", question_id: "q1", is_correct: true },
  { id: "q1b", question_id: "q1", is_correct: false },
  { id: "q2a", question_id: "q2", is_correct: false },
  { id: "q2b", question_id: "q2", is_correct: true },
  { id: "q3a", question_id: "q3", is_correct: true },
  { id: "q3b", question_id: "q3", is_correct: false },
];

describe("gradeQuiz", () => {
  it("todas correctas: score = maxScore", () => {
    expect(
      gradeQuiz(questions, options, { q1: "q1a", q2: "q2b", q3: "q3a" }),
    ).toEqual({ score: 6, maxScore: 6, correctCount: 3, totalCount: 3 });
  });

  it("todas incorrectas: score = 0", () => {
    expect(
      gradeQuiz(questions, options, { q1: "q1b", q2: "q2a", q3: "q3b" }),
    ).toEqual({ score: 0, maxScore: 6, correctCount: 0, totalCount: 3 });
  });

  it("mezcla parcial: solo suma points de las correctas", () => {
    expect(
      gradeQuiz(questions, options, { q1: "q1a", q2: "q2a", q3: "q3a" }),
    ).toEqual({ score: 3, maxScore: 6, correctCount: 2, totalCount: 3 });
  });

  it("pregunta sin respuesta cuenta como incorrecta (0 pts)", () => {
    expect(
      gradeQuiz(questions, options, { q1: "q1a", q3: "q3a" }),
    ).toEqual({ score: 3, maxScore: 6, correctCount: 2, totalCount: 3 });
  });

  it("answers vacio: score 0 pero maxScore se calcula", () => {
    expect(gradeQuiz(questions, options, {})).toEqual({
      score: 0,
      maxScore: 6,
      correctCount: 0,
      totalCount: 3,
    });
  });

  it("quiz vacio: shape coherente sin division ni NaN", () => {
    expect(gradeQuiz([], [], {})).toEqual({
      score: 0,
      maxScore: 0,
      correctCount: 0,
      totalCount: 0,
    });
  });

  it("optionId inexistente: ignorado, cuenta como incorrecta", () => {
    expect(
      gradeQuiz(questions, options, {
        q1: "no-existe",
        q2: "q2b",
        q3: "q3a",
      }),
    ).toEqual({ score: 4, maxScore: 6, correctCount: 2, totalCount: 3 });
  });

  it("optionId de otra pregunta: ignorado (defensa cross-question)", () => {
    // q1: usuario envia q2b (option de q2). Aunque q2b es correcta
    // PARA q2, no aplica a q1. Cuenta como incorrecta para q1.
    expect(
      gradeQuiz(questions, options, { q1: "q2b", q2: "q2b", q3: "q3a" }),
    ).toEqual({ score: 4, maxScore: 6, correctCount: 2, totalCount: 3 });
  });
});
