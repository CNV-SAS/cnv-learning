"use client";

// Dialog para crear un curso nuevo desde /admin/courses (Bloque 23.1.d).
// Form: titulo, slug (auto-generado desde titulo, editable), descripcion,
// coverUrl, isPublished (toggle, default OFF).
//
// El curso recien creado arranca con is_published=false hardcoded en el
// service (decision D3 plan B23); el toggle isPublished aqui es solo
// visual para informar al admin del estado inicial. El admin lo publica
// despues via EditCourseDialog.
//
// Slug auto-generation: mientras el user no edita manualmente el slug,
// el slug sigue al titulo (slugify). Una vez tocado, queda independiente
// (slugManuallyEdited=true).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createCourseAction } from "@/modules/admin/server/create-course.action";
import { slugify } from "@/lib/utils/slugify";

export function CreateCourseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [passingGrade, setPassingGrade] = useState(70);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setCoverUrl("");
    setPassingGrade(70);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugTouched(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCourseAction({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() === "" ? null : description.trim(),
        coverUrl: coverUrl.trim() === "" ? null : coverUrl.trim(),
        passingGrade,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Curso creado. Configúralo en el editor de contenido.");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo curso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear curso</DialogTitle>
          <DialogDescription>
            El curso arranca en modo borrador (no visible para alumnos).
            Habilítalo cuando esté listo desde el botón Editar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-course-title">Título</Label>
            <Input
              id="new-course-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
              placeholder="Diplomado en Medicina Bioeléctrica"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-slug">Slug</Label>
            <Input
              id="new-course-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              minLength={3}
              maxLength={60}
              disabled={isPending}
              placeholder="diplomado-medicina-bioelectrica"
            />
            <p className="text-xs text-muted-foreground">
              Solo minúsculas, números y guiones. Se usa en la URL del
              curso. {slugTouched ? "" : "Se genera automáticamente desde el título."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-description">
              Descripción <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="new-course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={isPending}
              rows={3}
              placeholder="Resumen del curso, dirigido a..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-cover">
              URL de la portada{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="new-course-cover"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              maxLength={500}
              disabled={isPending}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-course-passing-grade">
              Nota mínima para aprobar tareas obligatorias (% del puntaje
              máximo)
            </Label>
            <Input
              id="new-course-passing-grade"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={passingGrade}
              onChange={(e) =>
                setPassingGrade(Number(e.target.value))
              }
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Si la nota final de una tarea obligatoria está debajo de
              este umbral, no cuenta para el progreso. 0 = cualquier
              nota aprueba.
            </p>
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
              {isPending ? "Creando..." : "Crear curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
