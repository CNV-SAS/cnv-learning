"use client";

// Toggle (checkbox) del flag can_manage_course de una asignacion
// docente-curso (Bloque 23.1.e). Llama a
// updateTeacherCoursePermissionsAction al cambiar el estado.
//
// Pattern: optimistic-friendly via useTransition + router.refresh()
// post-action. Si la action falla, el toast.error informa pero el
// checkbox vuelve al estado del server (porque router.refresh fuerza
// re-render con el nuevo state). Mientras isPending, el checkbox
// esta disabled.

import { useTransition, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateTeacherCoursePermissionsAction } from "@/modules/admin/server/update-teacher-course-permissions.action";

interface TeacherCanManageCourseToggleProps {
  teacherUserId: string;
  courseId: string;
  initialValue: boolean;
}

export function TeacherCanManageCourseToggle({
  teacherUserId,
  courseId,
  initialValue,
}: TeacherCanManageCourseToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Mantenemos copia local para reaccion visual inmediata; en caso
  // de error, router.refresh() del server traera el estado correcto.
  const [value, setValue] = useState(initialValue);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateTeacherCoursePermissionsAction({
        teacherUserId,
        courseId,
        canManageCourse: next,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        setValue(previous);
        return;
      }
      router.refresh();
    });
  }

  const inputId = `can-manage-${courseId}-${teacherUserId}`;

  return (
    <label
      htmlFor={inputId}
      className="inline-flex cursor-pointer items-center gap-2"
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={value}
          onChange={handleChange}
          disabled={isPending}
          className="h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
        />
        {isPending && (
          <Loader2 className="absolute h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </span>
      <span className="text-sm">Puede gestionar curso completo</span>
    </label>
  );
}
