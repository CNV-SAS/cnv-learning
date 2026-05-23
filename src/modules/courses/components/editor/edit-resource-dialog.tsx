"use client";

// Dialog para editar metadata de un recurso existente (Bloque 20.2).
// Solo title + description; para cambiar el archivo o el URL el
// docente borra el recurso y crea uno nuevo (mismo patron que
// lesson_attachments).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { updateCourseResourceAction } from "@/modules/courses/server";
import type { CourseResource } from "@/modules/courses/types";

interface EditResourceDialogProps {
  resource: CourseResource;
}

export function EditResourceDialog({ resource }: EditResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCourseResourceAction({
        resourceId: resource.id,
        title: title.trim(),
        description: description.trim() === "" ? null : description,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Recurso actualizado.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar recurso</DialogTitle>
          <DialogDescription>
            Solo puedes editar el título y la descripción. Para cambiar el
            archivo o el enlace, elimina este recurso y crea uno nuevo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-resource-title">Título</Label>
            <Input
              id="edit-resource-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-resource-description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="edit-resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={isPending}
            />
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
