"use client";

// Dialog para editar un curso existente. Usado por admin desde
// /admin/courses (Bloque 23.1.d) y por teacher con can_manage_course
// desde /teacher/courses/[id]/edit (Bloque 23.1.f). Mismo componente
// para ambos: updateCourseAction valida la policy canEditCourseMeta
// server-side, asi que el dialog no necesita saber el rol del actor.
//
// Mismos campos que CreateCourseDialog + toggle isPublished editable.
// No regenera slug automatico al editar titulo (los slugs son URLs
// estables; cambiarlo por descuido rompe links externos).
//
// Movido en 23.1.f desde modules/admin/components/ a
// modules/courses/components/ porque ya no es admin-exclusive.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateCourseAction } from "@/modules/courses/server/update-course.action";
import type { Course } from "@/modules/courses/types";

interface EditCourseDialogProps {
  course: Course;
}

export function EditCourseDialog({ course }: EditCourseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [description, setDescription] = useState(course.description ?? "");
  const [coverUrl, setCoverUrl] = useState(course.cover_url ?? "");
  const [isPublished, setIsPublished] = useState(course.is_published);
  const [isPending, startTransition] = useTransition();

  // Reset state al abrir (por si el curso cambio en el server entre
  // aperturas). Cuando se cierra, NO reseteamos para mantener cambios
  // si el user cancela y reabre.
  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle(course.title);
      setSlug(course.slug);
      setDescription(course.description ?? "");
      setCoverUrl(course.cover_url ?? "");
      setIsPublished(course.is_published);
    }
    setOpen(next);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCourseAction({
        courseId: course.id,
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() === "" ? null : description.trim(),
        coverUrl: coverUrl.trim() === "" ? null : coverUrl.trim(),
        isPublished,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Curso actualizado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar curso</DialogTitle>
          <DialogDescription>
            Modifica los metadatos del curso. Habilita el toggle
            &quot;Publicado&quot; cuando esté listo para los alumnos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-course-title-${course.id}`}>Título</Label>
            <Input
              id={`edit-course-title-${course.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-course-slug-${course.id}`}>Slug</Label>
            <Input
              id={`edit-course-slug-${course.id}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              minLength={3}
              maxLength={60}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Cambiar el slug rompe URLs externas existentes del curso.
              Cámbialo solo si es necesario.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-course-description-${course.id}`}>
              Descripción <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id={`edit-course-description-${course.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={isPending}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-course-cover-${course.id}`}>
              URL de la portada{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id={`edit-course-cover-${course.id}`}
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              maxLength={500}
              disabled={isPending}
            />
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
            <input
              id={`edit-course-published-${course.id}`}
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor={`edit-course-published-${course.id}`}
                className="cursor-pointer text-sm font-medium"
              >
                Publicado
              </Label>
              <p className="text-xs text-muted-foreground">
                Si está activo, los alumnos inscritos pueden ver el
                curso. Si está apagado, queda solo visible para admins
                y docentes asignados.
              </p>
            </div>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
