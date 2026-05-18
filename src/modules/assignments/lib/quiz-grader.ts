// Helper puro para calificar un quiz. Sin acceso a BD; los datos
// los provee el service tras fetch via repositorio. Esto lo hace
// testeable sin mocks y aisla la logica de la composicion async.
//
// Reglas:
//   - maxScore = sum(question.points) de TODAS las preguntas.
//   - score = sum(question.points donde la respuesta elegida tiene
//     is_correct=true).
//   - Pregunta sin respuesta o respuesta apuntando a un optionId
//     que no existe / pertenece a otra pregunta: cuenta como
//     incorrecta (0 puntos para esa question).
//   - Edge case quiz vacio (questions=[]): {score:0, maxScore:0,
//     correctCount:0, totalCount:0} sin division ni NaN.

export interface QuestionForGrading {
  id: string;
  points: number;
}

export interface OptionForGrading {
  id: string;
  question_id: string;
  is_correct: boolean;
}

export interface QuizGradeResult {
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
}

export function gradeQuiz(
  questions: QuestionForGrading[],
  options: OptionForGrading[],
  answers: Record<string, string>,
): QuizGradeResult {
  let score = 0;
  let correctCount = 0;
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

  for (const question of questions) {
    const selectedOptionId = answers[question.id];
    if (!selectedOptionId) continue;

    // Validar que la option pertenezca a la pregunta (defensa contra
    // cross-question manipulation desde el cliente).
    const selectedOption = options.find(
      (o) => o.id === selectedOptionId && o.question_id === question.id,
    );
    if (!selectedOption) continue;

    if (selectedOption.is_correct) {
      score += question.points;
      correctCount += 1;
    }
  }

  return {
    score,
    maxScore,
    correctCount,
    totalCount: questions.length,
  };
}
