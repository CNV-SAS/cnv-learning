"use client";

// Dialog de confirmacion de borrado de leccion (Bloque 19.3).
// Recibe el impact pre-calculado por el page (progressCount). Si
// hay alumnos que ya marcaron completada la leccion, bloquea con
// mensaje contextual. Si no, requiere escribir el titulo exacto
// para confirmar.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteLessonAction } from "@/modules/courses/server";
import type { LessonDeleteImpact } from "@/modules/courses/services/course-content-editor.service";

interface DeleteLessonDialogProps {
  lessonId: string;
  lessonTitle: string;
  impact: LessonDeleteImpact;
}

export function DeleteLessonDialog({
  lessonId,
  lessonTitle,
  impact,
}: DeleteLessonDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasDeps = impact.progressCount > 0;
  const canSubmit = !hasDeps && confirmText.trim() === lessonTitle && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteLessonAction({ lessonId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Lección eliminada.");
      setOpen(false);
      setConfirmText("");
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
          <DialogTitle>Eliminar lección</DialogTitle>
          <DialogDescription>
            {hasDeps
              ? `Esta lección tiene ${impact.progressCount} alumno${impact.progressCount === 1 ? "" : "s"} que la completaron. No se puede eliminar mientras existan datos asociados. Para forzar la eliminación, contacta al administrador.`
              : `Esta acción no se puede deshacer. Escribe el título exacto de la lección para confirmar.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!hasDeps && (
            <div className="space-y-2">
              <Label htmlFor="confirm-lesson-title">
                Título de la lección
              </Label>
              <Input
                id="confirm-lesson-title"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isPending}
                placeholder={lessonTitle}
                autoComplete="off"
              />
            </div>
          )}
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
