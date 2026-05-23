"use client";

// Dialog compartido para crear y editar un modulo. Discrimina via
// mode prop: "create" toma courseId, "edit" toma module + courseId.
// Logica controlled state + toast + useTransition + revalidate
// implicito (server action hace revalidatePath).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
import {
  createModuleAction,
  updateModuleAction,
} from "@/modules/courses/server";
import type { Module } from "@/modules/courses/types";

type Props =
  | { mode: "create"; courseId: string; module?: undefined }
  | { mode: "edit"; courseId: string; module: Module };

export function ModuleFormDialog(props: Props) {
  const isEdit = props.mode === "edit";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(isEdit ? props.module.title : "");
  const [description, setDescription] = useState(
    isEdit ? (props.module.description ?? "") : "",
  );
  const [weight, setWeight] = useState<string>(
    isEdit ? String(Number(props.module.weight ?? 0)) : "0",
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    if (!isEdit) {
      setTitle("");
      setDescription("");
      setWeight("0");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const weightNum = Number(weight);
    if (Number.isNaN(weightNum)) {
      toast.error("El peso debe ser un número.");
      return;
    }

    startTransition(async () => {
      const trimmedDesc = description.trim();
      const result = isEdit
        ? await updateModuleAction({
            moduleId: props.module.id,
            title: title.trim(),
            description: trimmedDesc === "" ? null : trimmedDesc,
            weight: weightNum,
          })
        : await createModuleAction({
            courseId: props.courseId,
            title: title.trim(),
            description: trimmedDesc === "" ? null : trimmedDesc,
            weight: weightNum,
          });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(isEdit ? "Módulo actualizado." : "Módulo creado.");
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo módulo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar módulo" : "Nuevo módulo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza el título, la descripción o el peso del módulo."
              : "Se crea al final del curso. Podrás reordenarlo después."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Título</Label>
            <Input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
              placeholder="Ej. Introducción a la bioimpedancia"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="module-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={isPending}
              placeholder="Resumen breve del contenido del módulo."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-weight">Peso (0 a 100)</Label>
            <Input
              id="module-weight"
              type="number"
              min={0}
              max={100}
              step={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              La suma de pesos del curso no puede superar 100.
            </p>
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
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear módulo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
