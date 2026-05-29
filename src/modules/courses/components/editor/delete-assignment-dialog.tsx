"use client";

// Dialog de confirmacion de borrado de tarea (Bloque 19.4 + smoke
// E2E post-ISSUE-3 admin force-delete).
//
// Teacher: blocking estandar si hay entregas o calificaciones.
// Admin con datos: warning rojo + type-to-confirm + forceDelete.

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
import { deleteAssignmentAction } from "@/modules/courses/server";
import type { AssignmentDeleteImpact } from "@/modules/courses/services/course-content-editor.service";

interface DeleteAssignmentDialogProps {
  assignmentId: string;
  assignmentTitle: string;
  impact: AssignmentDeleteImpact;
  actorRole: "admin" | "teacher" | "student";
}

export function DeleteAssignmentDialog({
  assignmentId,
  assignmentTitle,
  impact,
  actorRole,
}: DeleteAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasDeps =
    impact.submissionCount > 0 || impact.gradingCount > 0;
  const isAdmin = actorRole === "admin";
  const isForce = hasDeps && isAdmin;
  const isBlocked = hasDeps && !isAdmin;
  const canSubmit =
    !isBlocked && confirmText.trim() === assignmentTitle && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteAssignmentAction({
        assignmentId,
        forceDelete: isForce,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Tarea eliminada.");
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
            {isForce ? "Eliminar tarea (FORZADO)" : "Eliminar tarea"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? `Esta tarea tiene ${impact.submissionCount} entrega${impact.submissionCount === 1 ? "" : "s"} y ${impact.gradingCount} calificación${impact.gradingCount === 1 ? "" : "es"}. No se puede eliminar mientras existan datos asociados. Para forzar la eliminación, contacta al administrador.`
              : isForce
                ? `Esta tarea tiene ${impact.submissionCount} entrega${impact.submissionCount === 1 ? "" : "s"} y ${impact.gradingCount} calificación${impact.gradingCount === 1 ? "" : "es"}. Al eliminarla se perderán TODOS los datos de los alumnos asociados. Esta acción es IRREVERSIBLE.`
                : `Esta acción no se puede deshacer. Escribe el título exacto de la tarea para confirmar.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isForce && (
            <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Vas a eliminar contenido con entregas calificadas.
                Esta acción quedará registrada en el audit log.
              </p>
            </div>
          )}
          {!isBlocked && (
            <div className="space-y-2">
              <Label htmlFor="confirm-assignment-title">
                Escribe el título de la tarea para confirmar
              </Label>
              <Input
                id="confirm-assignment-title"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isPending}
                placeholder={assignmentTitle}
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
