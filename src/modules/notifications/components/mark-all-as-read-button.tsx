"use client";

// MarkAllAsReadButton: invoca markAllAsReadAction. Solo se muestra
// si hay al menos 1 no leida (el caller decide cuando renderizar).
// useTransition + isPending da feedback visual durante el server
// action.

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllAsReadAction } from "@/modules/notifications/server";

export function MarkAllAsReadButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Notificaciones marcadas como leídas");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <CheckCheck className="mr-2 h-4 w-4" />
      {isPending ? "Marcando..." : "Marcar todas como leídas"}
    </Button>
  );
}
