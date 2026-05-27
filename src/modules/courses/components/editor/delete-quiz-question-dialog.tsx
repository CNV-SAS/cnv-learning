"use client";

// Dialog de confirmacion de borrado de pregunta de quiz (Bloque
// 23.2.c). CASCADE elimina las opciones automaticamente.
//
// Sin guard de "submissions previas" como modules/lessons: en MVP las
// quiz submissions persisten `quiz_answers` como JSON (no FK contra
// quiz_questions), asi que borrar la pregunta no rompe historico.
// Sin embargo el grading se vuelve dificil de auditar; el dialog
// advierte y requiere confirmacion textual con el prompt.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteQuizQuestionAction } from "@/modules/courses/server/delete-quiz-question.action";

interface DeleteQuizQuestionDialogProps {
  questionId: string;
  questionPrompt: string;
}

// Para confirmacion textual usamos los primeros 40 chars del prompt
// para evitar pedirle al docente que copie un parrafo entero.
function snippet(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40);
}

export function DeleteQuizQuestionDialog({
  questionId,
  questionPrompt,
}: DeleteQuizQuestionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const target = snippet(questionPrompt);
  const canSubmit = confirmText.trim() === target && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteQuizQuestionAction({ questionId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Pregunta eliminada.");
      setOpen(false);
      setConfirmText("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar pregunta</DialogTitle>
          <DialogDescription>
            Las opciones de esta pregunta también se eliminarán. Si
            algún alumno ya respondió este quiz, su calificación queda
            preservada pero el historial textual se hace más difícil de
            auditar. Escribe los primeros caracteres del enunciado para
            confirmar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-quiz-question-prompt">
              Inicio del enunciado
            </Label>
            <Input
              id="confirm-quiz-question-prompt"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isPending}
              placeholder={target}
              autoComplete="off"
            />
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
            <Button
              type="submit"
              variant="destructive"
              disabled={!canSubmit}
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
