"use client";

// QuizPlayer: Client Component que fetcha el quiz al mount, muestra
// preguntas con RadioGroup, valida que todas tengan respuesta antes
// de submit, y dispara POST /submit. Tras success: router.refresh()
// para que el page server-side rehidrate con GradeDisplay.
//
// Estados terminales:
//   - SUBMISSION_ALREADY_SUBMITTED al fetch del play: mensaje inline
//     con link al libro de notas.
//   - Otro error al fetch: mensaje genérico.
//   - Error al submit: toast, button se reactive para retry.
//   - Success: toast + router.refresh().
//
// AbortController para cleanup en mount/unmount + ante double-click
// del submit (cancela el request previo si todavia esta en flight).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface QuizQuestionDTO {
  id: string;
  prompt: string;
  position: number;
  points: number;
}

interface QuizOptionDTO {
  id: string;
  question_id: string;
  label: string;
  position: number;
}

interface QuizAssignmentDTO {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
}

interface QuizPlayerData {
  assignment: QuizAssignmentDTO;
  questions: QuizQuestionDTO[];
  options: QuizOptionDTO[];
}

type PlayResponse =
  | { ok: true; data: QuizPlayerData }
  | { ok: false; error: { code: string; message: string } };

type SubmitResponse =
  | {
      ok: true;
      data: {
        finalGrade: number;
        maxScore: number;
        correctCount: number;
        totalCount: number;
      };
    }
  | { ok: false; error: { code: string; message: string } };

interface QuizPlayerProps {
  courseId: string;
  assignmentId: string;
}

export function QuizPlayer({ courseId, assignmentId }: QuizPlayerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [data, setData] = useState<QuizPlayerData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const submitAbortRef = useRef<AbortController | null>(null);

  // Fetch del play. AbortController para cleanup si el componente
  // se desmonta antes de que la request resuelva.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/quizzes/${assignmentId}/play`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as PlayResponse;
        if (!json.ok) {
          setLoadError(json.error);
        } else {
          setData(json.data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError({
          code: "NETWORK",
          message: "No se pudo cargar el quiz. Intenta de nuevo.",
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchQuiz();
    return () => controller.abort();
  }, [assignmentId]);

  // Cleanup del submit AbortController si el componente se desmonta
  // mientras la request esta en flight.
  useEffect(() => {
    return () => {
      submitAbortRef.current?.abort();
    };
  }, []);

  function setAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function onSubmit() {
    if (submitting || !data) return;

    const allAnswered = data.questions.every((q) =>
      Boolean(answers[q.id]),
    );
    if (!allAnswered) {
      toast.error("Responde todas las preguntas antes de enviar.");
      return;
    }

    submitAbortRef.current?.abort();
    const controller = new AbortController();
    submitAbortRef.current = controller;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
        signal: controller.signal,
      });
      const json = (await res.json()) as SubmitResponse;
      if (!json.ok) {
        toast.error(json.error.message);
        return;
      }
      toast.success("Quiz enviado");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      if (!controller.signal.aborted) {
        setSubmitting(false);
      }
      if (submitAbortRef.current === controller) {
        submitAbortRef.current = null;
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Cargando quiz...
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    // Bloque post-23 ISSUE 3 sub-5: tres codes nuevos cubren los
    // estados "no puedes tomar el quiz ahora":
    //   - SUBMISSION_ALREADY_PASSED: aprobado.
    //   - SUBMISSION_PENDING_GRADE: entrega anterior pendiente de
    //     calificacion (raro en quiz, auto-graded; aplicaria si quiz
    //     se reintenta con UI pendiente).
    //   - SUBMISSION_MAX_ATTEMPTS_REACHED: sin intentos restantes.
    // SUBMISSION_ALREADY_SUBMITTED se mantiene como catch-all para
    // backward-compat (cohorte de prueba con flow anterior).
    const blockingCodes = new Set([
      "SUBMISSION_ALREADY_SUBMITTED",
      "SUBMISSION_ALREADY_PASSED",
      "SUBMISSION_PENDING_GRADE",
      "SUBMISSION_MAX_ATTEMPTS_REACHED",
    ]);
    if (blockingCodes.has(loadError.code)) {
      const title =
        loadError.code === "SUBMISSION_ALREADY_PASSED"
          ? "Ya aprobaste este quiz"
          : loadError.code === "SUBMISSION_MAX_ATTEMPTS_REACHED"
            ? "Agotaste tus intentos"
            : loadError.code === "SUBMISSION_PENDING_GRADE"
              ? "Tu entrega anterior está pendiente"
              : "Ya tomaste este quiz";
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{loadError.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/learn/${courseId}/grades`}>
                Ir al libro de notas
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          {loadError.message}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const optionsByQuestion = new Map<string, QuizOptionDTO[]>();
  for (const option of data.options) {
    const list = optionsByQuestion.get(option.question_id) ?? [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  }

  return (
    <div className="space-y-6">
      {data.questions.map((question, idx) => {
        const opts = optionsByQuestion.get(question.id) ?? [];
        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Pregunta {idx + 1}
                </span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({question.points} pt{question.points === 1 ? "" : "s"})
                </span>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {question.prompt}
                </p>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[question.id] ?? ""}
                onValueChange={(value) => setAnswer(question.id, value)}
                disabled={submitting}
              >
                {opts.map((option) => {
                  const optionId = `q-${question.id}-${option.id}`;
                  return (
                    <div
                      key={option.id}
                      className="flex items-center gap-3"
                    >
                      <RadioGroupItem value={option.id} id={optionId} />
                      <Label
                        htmlFor={optionId}
                        className="text-sm font-normal text-foreground"
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>
        );
      })}
      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full"
      >
        {submitting ? "Enviando..." : "Enviar respuestas"}
      </Button>
    </div>
  );
}
