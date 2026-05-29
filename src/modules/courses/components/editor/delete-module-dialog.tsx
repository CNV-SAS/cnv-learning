"use client";

// Dialog de confirmacion de borrado de modulo (Bloque 19.2 + smoke
// E2E post-ISSUE-3 admin force-delete).
//
// Teacher: si hay dependencias muestra mensaje y deshabilita el
// boton "Eliminar". Si no, type-to-confirm estandar del titulo.
//
// Admin con dependencias: warning rojo + type-to-confirm + envia
// forceDelete=true al action. El service registra forced=true en
// audit y arrastra CASCADE de toda la jerarquia (lecciones, tareas,
// entregas, calificaciones, attachments, etc.).

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
import { deleteModuleAction } from "@/modules/courses/server";
import type { ModuleDeleteImpact } from "@/modules/courses/services/course-content-editor.service";

interface DeleteModuleDialogProps {
  moduleId: string;
  moduleTitle: string;
  impact: ModuleDeleteImpact;
  // Smoke E2E post-ISSUE-3: si es admin y hay deps, en lugar de
  // bloquear, le permitimos forzar con warning fuerte.
  actorRole: "admin" | "teacher" | "student";
}

export function DeleteModuleDialog({
  moduleId,
  moduleTitle,
  impact,
  actorRole,
}: DeleteModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasDeps =
    impact.lessonCount > 0 ||
    impact.assignmentCount > 0 ||
    impact.submissionCount > 0 ||
    impact.gradingCount > 0;
  const isAdmin = actorRole === "admin";
  const isForce = hasDeps && isAdmin;
  const isBlocked = hasDeps && !isAdmin;

  // En force-mode (admin) tambien exigimos type-to-confirm para
  // evitar clics accidentales. En path estandar (sin deps) idem.
  const canSubmit =
    !isBlocked && confirmText.trim() === moduleTitle && !isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteModuleAction({
        moduleId,
        forceDelete: isForce,
      });
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
          <DialogTitle className={isForce ? "text-rose-700" : undefined}>
            {isForce ? "Eliminar módulo (FORZADO)" : "Eliminar módulo"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked
              ? `Este módulo tiene ${impact.lessonCount} lección${impact.lessonCount === 1 ? "" : "es"}, ${impact.assignmentCount} tarea${impact.assignmentCount === 1 ? "" : "s"}, ${impact.submissionCount} entrega${impact.submissionCount === 1 ? "" : "s"}, ${impact.gradingCount} calificación${impact.gradingCount === 1 ? "" : "es"}. No se puede eliminar mientras existan datos asociados. Para forzar la eliminación, contacta al administrador.`
              : isForce
                ? `Este módulo tiene datos de alumnos asociados. Al eliminarlo se perderán TODOS los datos: ${impact.lessonCount} lección${impact.lessonCount === 1 ? "" : "es"}, ${impact.assignmentCount} tarea${impact.assignmentCount === 1 ? "" : "s"}, ${impact.submissionCount} entrega${impact.submissionCount === 1 ? "" : "s"}, ${impact.gradingCount} calificación${impact.gradingCount === 1 ? "" : "es"}. Esta acción es IRREVERSIBLE.`
                : `Esta acción no se puede deshacer. Escribe el título exacto del módulo para confirmar.`}
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
              <Label htmlFor="confirm-module-title">
                Escribe el título del módulo para confirmar
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
