"use client";

// Dialog destructivo para eliminar un curso desde /admin/courses
// (Bloque 23 smoke #2).
//
// El borrado de un curso es irreversible y arrastra via CASCADE:
// modulos, lecciones, attachments, tareas, quiz preguntas/opciones,
// submissions, calificaciones, sugerencias IA, enrollments, foros,
// hilos, replies, anuncios, certificados emitidos al curso,
// certificaciones academicas asociadas, eventos de calendario,
// recursos, asignaciones docentes.
//
// Patron dual:
//   - activeEnrollmentCount > 0: dialog con warning visible (rojo)
//     enumerando el impacto + type-to-confirm con el titulo del
//     curso.
//   - activeEnrollmentCount === 0: dialog sin warning pero con el
//     mismo type-to-confirm (defensa contra deletes accidentales).
//
// El conteo de enrollments activos lo resuelve el server component
// padre (admin/courses/page.tsx) y lo pasa como prop. El service
// lo recalcula on submit para audit, asi que el conteo del dialog
// es solo informativo.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { deleteCourseAction } from "@/modules/admin/server/delete-course.action";
import type { Course } from "@/modules/courses/types";

interface DeleteCourseDialogProps {
  course: Course;
  activeEnrollmentCount: number;
}

export function DeleteCourseDialog({
  course,
  activeEnrollmentCount,
}: DeleteCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSubmit = confirmText.trim() === course.title && !isPending;
  const hasEnrollments = activeEnrollmentCount > 0;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await deleteCourseAction({
        courseId: course.id,
        confirmTitle: confirmText.trim(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Curso eliminado.");
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
          <DialogTitle>Eliminar curso</DialogTitle>
          <DialogDescription>
            Esta acción es irreversible. Para confirmar, escribe el
            título exacto del curso.
          </DialogDescription>
        </DialogHeader>
        {hasEnrollments && (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                Este curso tiene {activeEnrollmentCount}{" "}
                {activeEnrollmentCount === 1 ? "alumno inscrito" : "alumnos inscritos"}.
              </p>
              <p className="text-xs">
                Al eliminarlo se borrarán también sus inscripciones,
                progreso, tareas entregadas, calificaciones y
                certificados emitidos a este curso. ¿Confirmas?
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-course-title">
              Título del curso
            </Label>
            <Input
              id="confirm-course-title"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isPending}
              placeholder={course.title}
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
              {isPending ? "Eliminando..." : "Eliminar curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
