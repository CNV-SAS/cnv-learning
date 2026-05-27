"use client";

// Dialog para crear o editar una pregunta de quiz con sus opciones
// (Bloque 23.2.c). Modes: create + edit. En ambos casos el form
// envia el set completo de opciones; el service hace replaceOptions
// (delete + insert) en edit.
//
// Reglas:
//   - 2-6 opciones (min/max).
//   - exactamente 1 marcada como correcta (radio exclusivo).
//   - prompt 3-1000 chars, points 0-100.
//
// El radio "Correcta" se implementa con type="radio" + name compartido
// para garantizar exclusividad nativa del browser (sin necesidad de
// onChange manual para forzar uno-a-la-vez).
//
// Add/Remove de opciones: botones inline. Disabled cuando ya hay max
// o min para no romper la regla.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createQuizQuestionAction } from "@/modules/courses/server/create-quiz-question.action";
import { updateQuizQuestionAction } from "@/modules/courses/server/update-quiz-question.action";
import type {
  QuizOption,
  QuizQuestion,
} from "@/modules/assignments/types";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

interface OptionFormState {
  label: string;
  isCorrect: boolean;
}

interface CreateModeProps {
  mode: "create";
  assignmentId: string;
  question?: never;
  options?: never;
}

interface EditModeProps {
  mode: "edit";
  assignmentId: string;
  question: QuizQuestion;
  options: QuizOption[];
}

type QuizQuestionFormDialogProps = CreateModeProps | EditModeProps;

// Estado inicial de opciones para create mode: 4 vacias, ninguna
// correcta. El docente marca una y el submit valida.
function buildInitialOptions(props: QuizQuestionFormDialogProps): OptionFormState[] {
  if (props.mode === "edit") {
    return props.options
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ label: o.label, isCorrect: o.is_correct }));
  }
  return Array.from({ length: 4 }, () => ({ label: "", isCorrect: false }));
}

export function QuizQuestionFormDialog(props: QuizQuestionFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    props.mode === "edit" ? props.question.prompt : "",
  );
  const [points, setPoints] = useState(
    props.mode === "edit" ? Number(props.question.points) : 1,
  );
  const [options, setOptions] = useState<OptionFormState[]>(() =>
    buildInitialOptions(props),
  );
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset state al abrir en edit mode por si el server cambio.
      if (props.mode === "edit") {
        setPrompt(props.question.prompt);
        setPoints(Number(props.question.points));
        setOptions(buildInitialOptions(props));
      } else {
        setPrompt("");
        setPoints(1);
        setOptions(buildInitialOptions(props));
      }
    }
    setOpen(next);
  }

  function setOptionLabel(idx: number, label: string) {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, label } : o)),
    );
  }

  function setCorrectOption(idx: number) {
    setOptions((prev) =>
      prev.map((o, i) => ({ ...o, isCorrect: i === idx })),
    );
  }

  function addOption() {
    setOptions((prev) =>
      prev.length >= MAX_OPTIONS
        ? prev
        : [...prev, { label: "", isCorrect: false }],
    );
  }

  function removeOption(idx: number) {
    setOptions((prev) =>
      prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== idx),
    );
  }

  const correctCount = options.filter((o) => o.isCorrect).length;
  const hasEmptyOption = options.some((o) => o.label.trim() === "");
  const valid =
    prompt.trim().length >= 3 &&
    options.length >= MIN_OPTIONS &&
    options.length <= MAX_OPTIONS &&
    correctCount === 1 &&
    !hasEmptyOption;

  // Mensaje de validacion visible debajo de las opciones cuando falta
  // marcar correcta o hay opciones vacias.
  let validationMessage: string | null = null;
  if (correctCount === 0) {
    validationMessage = "Marca una opción como correcta.";
  } else if (correctCount > 1) {
    validationMessage = "Solo una opción puede estar marcada como correcta.";
  } else if (hasEmptyOption) {
    validationMessage = "Completa el texto de todas las opciones.";
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;

    const optionsPayload = options.map((o, idx) => ({
      label: o.label.trim(),
      isCorrect: o.isCorrect,
      position: idx + 1,
    }));

    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createQuizQuestionAction({
              assignmentId: props.assignmentId,
              prompt: prompt.trim(),
              points,
              options: optionsPayload,
            })
          : await updateQuizQuestionAction({
              questionId: props.question.id,
              prompt: prompt.trim(),
              points,
              options: optionsPayload,
            });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        props.mode === "create" ? "Pregunta creada." : "Pregunta actualizada.",
      );
      setOpen(false);
      router.refresh();
    });
  }

  const triggerLabel =
    props.mode === "create" ? "Nueva pregunta" : "Editar";
  const TriggerIcon = props.mode === "create" ? Plus : Pencil;
  const triggerVariant: "default" | "outline" =
    props.mode === "create" ? "default" : "outline";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={props.mode === "create" ? "default" : "sm"}
        >
          <TriggerIcon
            className={
              props.mode === "create"
                ? "mr-2 h-4 w-4"
                : "mr-2 h-3.5 w-3.5"
            }
          />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.mode === "create" ? "Nueva pregunta" : "Editar pregunta"}
          </DialogTitle>
          <DialogDescription>
            Escribe la pregunta y las opciones de respuesta. Marca la
            opción correcta con el radio button. Mínimo 2 opciones,
            máximo 6.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quiz-question-prompt">Pregunta</Label>
            <Textarea
              id="quiz-question-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              disabled={isPending}
              placeholder="¿Cuál es la frecuencia base del sistema ANI BIS-E?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiz-question-points">Puntos</Label>
            <Input
              id="quiz-question-points"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              required
              disabled={isPending}
              className="max-w-[140px]"
            />
            <p className="text-xs text-muted-foreground">
              Puntos otorgados al responder correctamente. Suma con las
              otras preguntas del quiz; el grade final se normaliza a
              la escala del assignment.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opciones</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={isPending || options.length >= MAX_OPTIONS}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>
            <ul className="space-y-2">
              {options.map((opt, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-md border border-border bg-card p-2"
                >
                  <input
                    type="radio"
                    name="quiz-correct-option"
                    id={`quiz-correct-${idx}`}
                    checked={opt.isCorrect}
                    onChange={() => setCorrectOption(idx)}
                    disabled={isPending}
                    className="mt-2 h-4 w-4 accent-emerald-600"
                    aria-label={`Marcar opción ${idx + 1} como correcta`}
                  />
                  <div className="flex-1 space-y-1">
                    <Input
                      value={opt.label}
                      onChange={(e) => setOptionLabel(idx, e.target.value)}
                      maxLength={500}
                      disabled={isPending}
                      placeholder={`Opción ${idx + 1}`}
                    />
                    {opt.isCorrect && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700"
                      >
                        Correcta
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => removeOption(idx)}
                    disabled={isPending || options.length <= MIN_OPTIONS}
                    aria-label={`Quitar opción ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            {validationMessage && (
              <p className="text-xs text-destructive">{validationMessage}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || isPending}>
              {isPending
                ? "Guardando..."
                : props.mode === "create"
                  ? "Crear pregunta"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
