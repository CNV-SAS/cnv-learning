"use client";

// Dialog de confirmacion de borrado de modulo (Bloque 19.2).
// Recibe el impact pre-calculado por el page (Server Component
// resuelve via courseContentEditorService.getModuleDeleteImpact).
// Si hay dependencias muestra mensaje contextual y deshabilita el
// boton "Eliminar". Si no hay dependencias, muestra confirmacion
// estandar (escribir el titulo del modulo para confirmar).

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
import { deleteModuleAction } from "@/modules/courses/server";
import type { ModuleDeleteImpact } from "@/modules/courses/services/course-content-editor.service";

interface DeleteModuleDialogProps {
  moduleId: string;
  moduleTitle: string;
  impact: ModuleDeleteImpact;
}

export function DeleteModuleDialog({
  moduleId,
  moduleTitle,
  impact,
}: DeleteModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasDeps =
    impact.lessonCount > 0 ||
    impact.assignmentCount > 0 ||
    impact.submissionCount > 0 ||
    impact.gradingCount > 0;

  const canSubmit = !hasDeps && confirmText.trim() === moduleTitle && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteModuleAction({ moduleId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Módulo eliminado.");
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
          <DialogTitle>Eliminar módulo</DialogTitle>
          <DialogDescription>
            {hasDeps
              ? `Este módulo tiene ${impact.lessonCount} lección${impact.lessonCount === 1 ? "" : "es"}, ${impact.assignmentCount} tarea${impact.assignmentCount === 1 ? "" : "s"}, ${impact.submissionCount} entrega${impact.submissionCount === 1 ? "" : "s"}, ${impact.gradingCount} calificación${impact.gradingCount === 1 ? "" : "es"}. No se puede eliminar mientras existan datos asociados. Para forzar la eliminación, contacta al administrador.`
              : `Esta acción no se puede deshacer. Escribe el título exacto del módulo para confirmar.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!hasDeps && (
            <div className="space-y-2">
              <Label htmlFor="confirm-module-title">
                Título del módulo
              </Label>
              <Input
                id="confirm-module-title"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isPending}
                placeholder={moduleTitle}
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
