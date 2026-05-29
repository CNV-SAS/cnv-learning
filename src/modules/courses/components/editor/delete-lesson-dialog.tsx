"use client";

// Dialog de confirmacion de borrado de leccion (Bloque 19.3 + smoke
// E2E post-ISSUE-3 admin force-delete).
//
// Teacher: blocking estandar si hay progreso de alumnos.
// Admin con progreso: warning rojo + type-to-confirm + forceDelete.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";
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
  actorRole: "admin" | "teacher" | "student";
}

export function DeleteLessonDialog({
  lessonId,
  lessonTitle,
  impact,
  actorRole,
}: DeleteLessonDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasDeps = impact.progressCount > 0;
  const isAdmin = actorRole === "admin";
  const isForce = hasDeps && isAdmin;
  const isBlocked = hasDeps && !isAdmin;
  const canSubmit =
    !isBlocked && confirmText.trim() === lessonTitle && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteLessonAction({
        lessonId,
        forceDelete: isForce,
      });
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
          <DialogTitle className={isForce ? "text-rose-700" : undefined}>
            {isForce ? "Eliminar lección (FORZADO)" : "Eliminar lección"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? `Esta lección tiene ${impact.progressCount} alumno${impact.progressCount === 1 ? "" : "s"} que la completaron. No se puede eliminar mientras existan datos asociados. Para forzar la eliminación, contacta al administrador.`
              : isForce
                ? `Esta lección tiene ${impact.progressCount} alumno${impact.progressCount === 1 ? "" : "s"} con progreso registrado. Al eliminarla se perderán TODOS los datos de progreso. Esta acción es IRREVERSIBLE.`
                : `Esta acción no se puede deshacer. Escribe el título exacto de la lección para confirmar.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isForce && (
            <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Vas a eliminar contenido con datos de alumnos. Esta
                acción quedará registrada en el audit log.
              </p>
            </div>
          )}
          {!isBlocked && (
            <div className="space-y-2">
              <Label htmlFor="confirm-lesson-title">
                Escribe el título de la lección para confirmar
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
              {isPending
                ? "Eliminando..."
                : isForce
                  ? "Eliminar de forma forzada"
                  : "Eliminar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
