"use client";

// Dialog simple de confirmacion para borrar un recurso (Bloque 20.2).
// Decision D7 del planning: SIN confirm-by-title (los recursos no
// tienen dependencias downstream). Solo "¿Eliminar este recurso?" +
// boton destructivo.

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
import { deleteCourseResourceAction } from "@/modules/courses/server";

interface DeleteResourceDialogProps {
  resourceId: string;
  resourceTitle: string;
}

export function DeleteResourceDialog({
  resourceId,
  resourceTitle,
}: DeleteResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCourseResourceAction({ resourceId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Recurso eliminado.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar recurso</DialogTitle>
          <DialogDescription>
            ¿Eliminar &quot;{resourceTitle}&quot;? Esta acción no se puede
            deshacer. El archivo se borra del almacenamiento.
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
            {isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
