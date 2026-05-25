"use client";

// DeleteAcademicButton: Client Component que abre un Dialog de
// confirmacion para eliminar un cert academico (borra row + blob).
// Como el cert academico no tiene revocacion logica, la eliminacion
// es definitiva.

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
import { deleteAcademicCertificateAction } from "@/modules/certificates/server";

interface DeleteAcademicButtonProps {
  certificateId: string;
  courseTitle: string;
}

export function DeleteAcademicButton({
  certificateId,
  courseTitle,
}: DeleteAcademicButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAcademicCertificateAction({
        id: certificateId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Certificado académico eliminado.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar certificado académico</DialogTitle>
          <DialogDescription>
            Vas a borrar el certificado académico del curso{" "}
            <span className="font-semibold text-foreground">
              {courseTitle}
            </span>
            . Se borra el PDF y el registro de forma definitiva. Esta
            acción no se puede deshacer.
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
