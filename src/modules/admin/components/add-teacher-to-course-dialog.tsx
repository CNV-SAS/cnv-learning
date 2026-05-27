"use client";

// Dialog para asignar un docente al curso desde la perspectiva del
// CURSO (Bloque 23.1.e). Diferente de AssignCourseToTeacherDialog
// que es desde la perspectiva del USER en /admin/users/[id]/enrollments.
//
// Recibe la lista de teachers disponibles (role=teacher, no asignados
// al curso) pre-resuelta por la page, dropdown Select. Llama a
// assignTeacherToCourseAction sin flag can_manage_course (default
// false en la BD); el admin habilita despues via el toggle.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignTeacherToCourseAction } from "@/modules/admin/server/assign-teacher-to-course.action";

export interface AvailableTeacher {
  id: string;
  fullName: string;
  email: string;
}

interface AddTeacherToCourseDialogProps {
  courseId: string;
  availableTeachers: AvailableTeacher[];
}

export function AddTeacherToCourseDialog({
  courseId,
  availableTeachers,
}: AddTeacherToCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!teacherId) {
      toast.error("Selecciona un docente.");
      return;
    }
    startTransition(async () => {
      const result = await assignTeacherToCourseAction({
        teacherUserId: teacherId,
        courseId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Docente asignado al curso.");
      setOpen(false);
      setTeacherId("");
      router.refresh();
    });
  }

  const noneAvailable = availableTeachers.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={noneAvailable}>
          <UserPlus className="mr-2 h-4 w-4" />
          Asignar docente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar docente al curso</DialogTitle>
          <DialogDescription>
            El docente quedará asignado al curso y podrá editar
            contenido (módulos, lecciones, tareas, recursos). Por
            defecto NO podrá editar metadatos del curso; habilítalo
            con el toggle &quot;Puede gestionar curso completo&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-teacher-select">Docente</Label>
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
              disabled={isPending}
            >
              <SelectTrigger id="add-teacher-select">
                <SelectValue placeholder="Selecciona un docente" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName}{" "}
                    <span className="text-muted-foreground">({t.email})</span>
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
            <Button type="submit" disabled={isPending || !teacherId}>
              {isPending ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
