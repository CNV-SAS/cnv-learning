"use client";

// Boton para forzar el envio de un email de reset al usuario.
// Confirmacion inline (no Dialog) porque es accion reversible:
// el peor caso es enviar un email que el user puede ignorar.

import { useTransition } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPasswordResetAction } from "@/modules/admin/server/send-password-reset.action";

interface SendPasswordResetButtonProps {
  userId: string;
}

export function SendPasswordResetButton({
  userId,
}: SendPasswordResetButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendPasswordResetAction({ userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Email de reseteo enviado.");
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <KeyRound className="mr-2 h-4 w-4" />
      {isPending ? "Enviando..." : "Forzar reseteo de contraseña"}
    </Button>
  );
}
