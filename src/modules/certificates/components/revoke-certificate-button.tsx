"use client";

// RevokeCertificateButton: Client Component que abre un Dialog
// shadcn con form para captura del motivo de revocacion. Al
// confirmar, llama revokeCertificateAction y cierra el dialog.
//
// useTransition + isPending da feedback visual durante el server
// action. Tras success, toast + close dialog + reset reason. El
// revalidatePath del action actualiza la tabla del parent.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { revokeCertificateAction } from "@/modules/certificates/server";

interface RevokeCertificateButtonProps {
  certificateId: string;
  studentName: string;
  courseTitle: string;
}

export function RevokeCertificateButton({
  certificateId,
  studentName,
  courseTitle,
}: RevokeCertificateButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      toast.error("El motivo debe tener al menos 3 caracteres.");
      return;
    }
    startTransition(async () => {
      const result = await revokeCertificateAction({
        certificateId,
        reason: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Certificado revocado");
      setOpen(false);
      setReason("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ShieldOff className="mr-2 h-3.5 w-3.5" />
          Revocar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revocar certificado</DialogTitle>
          <DialogDescription>
            Estás por revocar el certificado de{" "}
            <span className="font-semibold text-foreground">
              {studentName}
            </span>{" "}
            del curso{" "}
            <span className="font-semibold text-foreground">
              {courseTitle}
            </span>
            . La página de verificación mostrará el estado revocado y
            el motivo. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Motivo de revocación</Label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={3}
              maxLength={500}
              disabled={isPending}
              placeholder="Ej: inconsistencia detectada en los datos académicos."
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
              {isPending ? "Revocando..." : "Confirmar revocación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
