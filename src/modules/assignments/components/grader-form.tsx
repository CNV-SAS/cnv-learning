"use client";

// GraderForm: formulario del docente para publicar calificacion.
// Client Component porque maneja state + invoca server action.
// Input number 0..maxScore + textarea feedback. Validacion
// client-side ligera (campos no vacios + grade dentro de rango)
// antes de invocar publishGradingAction; el service hace la
// validacion definitiva contra assignment.max_score.
//
// Bloque 8 sub-bloque 8.4: acepta initialGrade, initialFeedback y
// aiSuggestionId opcionales. El parent (GraderSection) usa `key`
// para forzar re-mount cuando cambian (click en "Aplicar"); asi
// el state local se inicializa con los nuevos defaults sin
// necesidad de useEffect + setState (patron React 19 idiomatico).
//
// Intencional: "Aplicar" sobreescribe lo que el docente haya
// escrito (el re-mount limpia el state local). El docente puede
// editar después del Apply; el aiSuggestionId persiste en el
// payload final aunque haya editado los valores.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publishGradingAction } from "@/modules/assignments/server";

interface GraderFormProps {
  submissionId: string;
  maxScore: number;
  initialGrade?: string;
  initialFeedback?: string;
  aiSuggestionId?: string;
}

export function GraderForm({
  submissionId,
  maxScore,
  initialGrade,
  initialFeedback,
  aiSuggestionId,
}: GraderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState<string>(initialGrade ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const gradeNum = Number(grade);
    if (!Number.isFinite(gradeNum) || gradeNum < 0) {
      toast.error("La nota debe ser un número válido mayor o igual a 0.");
      return;
    }
    if (gradeNum > maxScore) {
      toast.error(`La nota no puede exceder ${maxScore}.`);
      return;
    }
    if (feedback.trim().length === 0) {
      toast.error("El feedback no puede estar vacío.");
      return;
    }

    setLoading(true);
    try {
      const result = await publishGradingAction({
        submissionId,
        finalGrade: gradeNum,
        feedback,
        ...(aiSuggestionId ? { aiSuggestionId } : {}),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Calificación publicada");
      router.refresh();
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grader-grade">Nota (0 a {maxScore})</Label>
        <Input
          id="grader-grade"
          type="number"
          inputMode="decimal"
          min={0}
          max={maxScore}
          step="0.1"
          value={grade}
          disabled={loading}
          onChange={(e) => setGrade(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="grader-feedback">Feedback</Label>
        <Textarea
          id="grader-feedback"
          rows={6}
          value={feedback}
          disabled={loading}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Comentarios para el estudiante."
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Publicando..." : "Publicar calificación"}
      </Button>
    </form>
  );
}
