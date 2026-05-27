"use client";

// Boton para remover la asignacion docente-curso de course_teachers.
// Dialog con confirmacion porque el docente pierde acceso al panel
// y a calificar entregas del curso (revertible re-asignando).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
import { removeTeacherFromCourseAction } from "@/modules/admin/server/remove-teacher-from-course.action";

interface RemoveTeacherFromCourseButtonProps {
  teacherUserId: string;
  courseId: string;
  courseTitle: string;
}

export function RemoveTeacherFromCourseButton({
  teacherUserId,
  courseId,
  courseTitle,
}: RemoveTeacherFromCourseButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await removeTeacherFromCourseAction({
        teacherUserId,
        courseId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Asignación docente removida.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Ban className="mr-2 h-3.5 w-3.5" />
          Remover
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover asignación docente</DialogTitle>
          <DialogDescription>
            El docente perderá acceso al panel docente y a las
            herramientas de calificación del curso{" "}
            <span className="font-semibold text-foreground">
              {courseTitle}
            </span>
            . Las calificaciones que ya haya publicado se preservan
            (audit + entrega permanecen intactos).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Removiendo..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
