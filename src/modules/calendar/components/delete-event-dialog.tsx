"use client";

// Dialog destructivo para borrar un evento del calendario. Sin
// typeo de confirmacion (el evento no destruye progreso del
// alumno: un teacher recrea facilmente si fue accidente).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteEventAction } from "@/modules/calendar/server/delete-event.action";

interface DeleteEventDialogProps {
  eventId: string;
  courseId: string;
  eventTitle: string;
}

export function DeleteEventDialog({
  eventId,
  courseId,
  eventTitle,
}: DeleteEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteEventAction({ eventId, courseId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Evento eliminado.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar evento</DialogTitle>
          <DialogDescription>
            El evento{" "}
            <span className="font-semibold text-foreground">
              {eventTitle}
            </span>{" "}
            se borrará del calendario. Los estudiantes dejarán de verlo.
            Puedes crearlo de nuevo si es necesario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Eliminando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
