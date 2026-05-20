"use client";

// Boton para cancelar (soft delete) un enrollment activo. Confirm
// inline via Dialog porque cancelar bloquea el acceso del student
// al curso (revertible, pero impactante UX).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
import { cancelEnrollmentAction } from "@/modules/admin/server/cancel-enrollment.action";

interface CancelEnrollmentButtonProps {
  enrollmentId: string;
  userId: string;
  courseTitle: string;
}

export function CancelEnrollmentButton({
  enrollmentId,
  userId,
  courseTitle,
}: CancelEnrollmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelEnrollmentAction({ enrollmentId, userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Inscripción cancelada.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Ban className="mr-2 h-3.5 w-3.5" />
          Cancelar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar inscripción</DialogTitle>
          <DialogDescription>
            El usuario perderá acceso al curso{" "}
            <span className="font-semibold text-foreground">
              {courseTitle}
            </span>
            . Su progreso y entregas se preservan; podrás reactivar la
            inscripción más adelante si es necesario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Cancelando..." : "Confirmar cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
