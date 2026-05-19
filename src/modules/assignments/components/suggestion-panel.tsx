"use client";

// SuggestionPanel: panel de sugerencia IA para el grader del
// docente. Cliente que invoca POST /api/grading/suggest y muestra
// el resultado o el estado de error.
//
// Bloque 8 sub-bloque 8.4. Visible solo cuando assignment.type es
// file_upload o essay; quiz_multiple_choice se calificó solo
// (early return defensivo aunque el padre tampoco lo renderiza).
//
// Aviso por tipo SIEMPRE visible (antes y despues de generar):
//   - essay: "Sugerencia basada en el texto del ensayo..."
//   - file_upload: "Sugerencia basada en la descripcion... La IA
//     NO tiene acceso al archivo. Revisa manualmente."
//
// Errores mapeados al code original del backend (AI_TIMEOUT,
// AI_RATE_LIMITED, AI_PROVIDER_ERROR, AI_PARSE_FAILED). El
// mensaje del error ya viene user-friendly del service; el
// cliente lo muestra directo.

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AiGradingSuggestion } from "@/modules/assignments/types";

interface SuggestionPanelProps {
  submissionId: string;
  assignmentType: "file_upload" | "essay" | "quiz_multiple_choice";
  initialSuggestion: AiGradingSuggestion | null;
  onApply: (params: {
    grade: number;
    feedback: string;
    suggestionId: string;
  }) => void;
}

type SuggestResponse =
  | { ok: true; data: { suggestion: AiGradingSuggestion } }
  | { ok: false; error: { code: string; message: string } };

function getAdviceText(
  type: SuggestionPanelProps["assignmentType"],
): string {
  if (type === "essay") {
    return "Sugerencia basada en el texto del ensayo del estudiante.";
  }
  if (type === "file_upload") {
    return "Sugerencia basada en la descripción de la tarea. La IA no tiene acceso al archivo adjunto. Revísalo manualmente antes de publicar la calificación.";
  }
  return "";
}

export function SuggestionPanel({
  submissionId,
  assignmentType,
  initialSuggestion,
  onApply,
}: SuggestionPanelProps) {
  const [suggestion, setSuggestion] = useState<AiGradingSuggestion | null>(
    initialSuggestion,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  if (assignmentType === "quiz_multiple_choice") return null;

  async function fetchSuggestion() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/grading/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
        signal: controller.signal,
      });
      const json = (await res.json()) as SuggestResponse;
      if (!json.ok) {
        setError(json.error);
        toast.error(json.error.message);
        return;
      }
      setSuggestion(json.data.suggestion);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = "Error inesperado. Intenta de nuevo.";
      setError({ code: "NETWORK", message });
      toast.error(message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function onGenerate() {
    if (loading) return;
    await fetchSuggestion();
  }

  async function onRegenerate() {
    if (loading) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Esto consumirá una nueva llamada a IA. ¿Continuar?",
      )
    ) {
      return;
    }
    await fetchSuggestion();
  }

  function handleApply() {
    if (!suggestion || suggestion.status !== "success") return;
    if (
      suggestion.suggested_grade === null ||
      suggestion.generated_feedback === null
    ) {
      return;
    }
    onApply({
      grade: suggestion.suggested_grade,
      feedback: suggestion.generated_feedback,
      suggestionId: suggestion.id,
    });
    toast.success("Sugerencia aplicada al formulario");
  }

  const advice = getAdviceText(assignmentType);
  const hasSuccess =
    suggestion !== null &&
    suggestion.status === "success" &&
    suggestion.suggested_grade !== null &&
    suggestion.generated_feedback !== null;
  const hasFailedPrevious =
    suggestion !== null && suggestion.status !== "success";

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-emerald-700" />
          SpeedGrader IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {advice && (
          <p className="text-xs text-muted-foreground">{advice}</p>
        )}

        {hasSuccess && suggestion && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-black tracking-tight text-emerald-700">
                {suggestion.suggested_grade}
              </span>
              <span className="text-sm text-muted-foreground">
                nota sugerida
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Feedback sugerido
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {suggestion.generated_feedback}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta sugerencia fue generada por IA. Revísala antes de
              publicarla como calificación final.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleApply}
                disabled={loading}
                className="flex-1"
              >
                Aplicar a formulario
              </Button>
              <Button
                onClick={onRegenerate}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? "Generando..." : "Regenerar"}
              </Button>
            </div>
          </div>
        )}

        {hasFailedPrevious && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El intento anterior no se completó. Vuelve a generar la
              sugerencia para intentar de nuevo.
            </p>
            <Button onClick={onGenerate} className="w-full">
              Generar de nuevo
            </Button>
          </div>
        )}

        {suggestion === null && !loading && !error && (
          <Button onClick={onGenerate} className="w-full">
            Generar sugerencia IA
          </Button>
        )}

        {suggestion === null && loading && (
          <Button disabled className="w-full">
            Generando sugerencia...
          </Button>
        )}

        {error && suggestion === null && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button onClick={onGenerate} className="w-full">
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
