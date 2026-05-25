"use client";

// IssueCorporateButton: Client Component que abre un Dialog de
// confirmacion para emitir el certificado "Profesional Conectado
// CNV" al student. Operacion manual del admin (sin input adicional
// del lado del cliente; el service hace policy + anti-dup + hash +
// audit).

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";
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
import { issueCorporateCertificateAction } from "@/modules/certificates/server";

interface IssueCorporateButtonProps {
  userId: string;
  studentName: string;
}

export function IssueCorporateButton({
  userId,
  studentName,
}: IssueCorporateButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await issueCorporateCertificateAction({ userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Certificado corporativo emitido.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Award className="mr-2 h-4 w-4" />
          Emitir certificado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir Profesional Conectado CNV</DialogTitle>
          <DialogDescription>
            Estás por emitir el certificado{" "}
            <span className="font-semibold text-foreground">
              Profesional Conectado CNV
            </span>{" "}
            para{" "}
            <span className="font-semibold text-foreground">
              {studentName}
            </span>
            . Esta es una decisión institucional. El certificado queda
            registrado con hash de verificación y se puede revocar más
            adelante si es necesario.
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
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Emitiendo..." : "Confirmar emisión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
