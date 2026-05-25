"use client";

// RevokeCorporateButton: Client Component que abre un Dialog con
// form para captura del motivo de revocacion del certificado
// corporativo. Misma UX que RevokeCertificateButton (Constancia).

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
import { revokeCorporateCertificateAction } from "@/modules/certificates/server";

interface RevokeCorporateButtonProps {
  certificateId: string;
  studentName: string;
}

export function RevokeCorporateButton({
  certificateId,
  studentName,
}: RevokeCorporateButtonProps) {
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
      const result = await revokeCorporateCertificateAction({
        id: certificateId,
        reason: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Certificado corporativo revocado.");
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
          <DialogTitle>Revocar Profesional Conectado CNV</DialogTitle>
          <DialogDescription>
            Vas a revocar el certificado corporativo de{" "}
            <span className="font-semibold text-foreground">
              {studentName}
            </span>
            . La página pública de verificación mostrará el estado
            revocado y el motivo. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="revoke-corporate-reason">
              Motivo de revocación
            </Label>
            <Textarea
              id="revoke-corporate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={3}
              maxLength={500}
              disabled={isPending}
              placeholder="Ej: ruptura del código de conducta."
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
