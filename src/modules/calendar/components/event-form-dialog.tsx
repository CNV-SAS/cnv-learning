"use client";

// Dialog reutilizable para crear y editar eventos del calendario.
// Discriminated union por `mode: 'create' | 'edit'` siguiendo el
// patron del MVP.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { CalendarPlus, Pencil } from "lucide-react";
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
import { createEventAction } from "@/modules/calendar/server/create-event.action";
import { updateEventAction } from "@/modules/calendar/server/update-event.action";

type EventFormDialogProps =
  | {
      mode: "create";
      courseId: string;
    }
  | {
      mode: "edit";
      courseId: string;
      eventId: string;
      initialTitle: string;
      initialDescription: string;
      initialStartsAt: string;
      initialEndsAt: string;
    };

export function EventFormDialog(props: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(
    props.mode === "edit" ? props.initialTitle : "",
  );
  const [description, setDescription] = useState(
    props.mode === "edit" ? props.initialDescription : "",
  );
  const [startsAt, setStartsAt] = useState(
    props.mode === "edit" ? props.initialStartsAt : "",
  );
  const [endsAt, setEndsAt] = useState(
    props.mode === "edit" ? props.initialEndsAt : "",
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    if (props.mode === "create") {
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanDescription = description.trim();
    const cleanEndsAt = endsAt.trim();
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createEventAction({
              courseId: props.courseId,
              title: title.trim(),
              description: cleanDescription || undefined,
              startsAt,
              endsAt: cleanEndsAt || undefined,
            })
          : await updateEventAction({
              eventId: props.eventId,
              courseId: props.courseId,
              title: title.trim(),
              description: cleanDescription || undefined,
              startsAt,
              endsAt: cleanEndsAt || undefined,
            });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        props.mode === "create" ? "Evento creado." : "Evento actualizado.",
      );
      setOpen(false);
      reset();
    });
  }

  const triggerLabel = props.mode === "create" ? "Nuevo evento" : "Editar";
  const dialogTitle =
    props.mode === "create" ? "Nuevo evento" : "Editar evento";
  const submitLabel =
    props.mode === "create"
      ? isPending
        ? "Creando..."
        : "Crear evento"
      : isPending
        ? "Guardando..."
        : "Guardar cambios";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Las fechas son visibles para los estudiantes inscritos en el
            curso. Para un evento de un solo día, deja vacía la fecha de
            fin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Título</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
              placeholder="Ej: Examen del módulo 3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Descripción (opcional)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={isPending}
              placeholder="Detalles del evento, materiales, instrucciones."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-starts-at">Fecha de inicio</Label>
              <Input
                id="event-starts-at"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-ends-at">Fecha de fin (opcional)</Label>
              <Input
                id="event-ends-at"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={startsAt || undefined}
                disabled={isPending}
              />
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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
