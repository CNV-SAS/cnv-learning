"use client";

// Dialog para asignar un curso al usuario. Lista todos los cursos
// disponibles en un select; al confirmar llama createEnrollmentAction.
// El service reactiva enrollments cancelados o crea nuevos.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { BookPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEnrollmentAction } from "@/modules/admin/server/create-enrollment.action";

export interface AvailableCourse {
  id: string;
  title: string;
}

interface AssignCourseDialogProps {
  userId: string;
  availableCourses: AvailableCourse[];
}

export function AssignCourseDialog({
  userId,
  availableCourses,
}: AssignCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!courseId) {
      toast.error("Selecciona un curso.");
      return;
    }
    startTransition(async () => {
      const result = await createEnrollmentAction({ userId, courseId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Usuario inscrito al curso.");
      setOpen(false);
      setCourseId("");
    });
  }

  const noCoursesAvailable = availableCourses.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={noCoursesAvailable}>
          <BookPlus className="mr-2 h-4 w-4" />
          Asignar curso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar curso</DialogTitle>
          <DialogDescription>
            El usuario quedará inscrito y podrá acceder al contenido
            del curso desde su dashboard. Si tenía una inscripción
            previa cancelada al mismo curso, se reactivará preservando
            su progreso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enrollment-course">Curso</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={isPending}
            >
              <SelectTrigger id="enrollment-course">
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !courseId}>
              {isPending ? "Inscribiendo..." : "Inscribir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
