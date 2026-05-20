"use client";

// Dialog para asignar un curso a un docente (target.role='teacher')
// via course_teachers. Analogo a AssignCourseDialog pero invoca
// assignTeacherToCourseAction (course_teachers, no enrollments).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
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
import { assignTeacherToCourseAction } from "@/modules/admin/server/assign-teacher-to-course.action";

export interface AvailableCourse {
  id: string;
  title: string;
}

interface AssignCourseToTeacherDialogProps {
  teacherUserId: string;
  availableCourses: AvailableCourse[];
}

export function AssignCourseToTeacherDialog({
  teacherUserId,
  availableCourses,
}: AssignCourseToTeacherDialogProps) {
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
      const result = await assignTeacherToCourseAction({
        teacherUserId,
        courseId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Docente asignado al curso.");
      setOpen(false);
      setCourseId("");
    });
  }

  const noCoursesAvailable = availableCourses.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={noCoursesAvailable}>
          <GraduationCap className="mr-2 h-4 w-4" />
          Asignar como docente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar como docente</DialogTitle>
          <DialogDescription>
            El usuario quedará registrado como docente del curso y podrá
            ver el panel docente, calificar entregas y emitir anuncios
            del curso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-assign-course">Curso</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={isPending}
            >
              <SelectTrigger id="teacher-assign-course">
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
              {isPending ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
