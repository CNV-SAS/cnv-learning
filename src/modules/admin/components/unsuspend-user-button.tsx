"use client";

// Boton para levantar la suspension de un usuario. Sin Dialog: es
// accion reversible inversa y no destructiva.

import { useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unsuspendUserAction } from "@/modules/admin/server/unsuspend-user.action";

interface UnsuspendUserButtonProps {
  userId: string;
}

export function UnsuspendUserButton({ userId }: UnsuspendUserButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await unsuspendUserAction({ userId });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Suspensión levantada.");
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <ShieldCheck className="mr-2 h-4 w-4" />
      {isPending ? "Reactivando..." : "Levantar suspensión"}
    </Button>
  );
}
