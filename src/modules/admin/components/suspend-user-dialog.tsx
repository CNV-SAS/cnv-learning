"use client";

// Dialog para suspender un usuario. Captura motivo (textarea) y
// llama suspendUserAction. Anti-self + anti-lockout en service.

import { useState, useTransition, type FormEvent } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suspendUserAction } from "@/modules/admin/server/suspend-user.action";

interface SuspendUserDialogProps {
  userId: string;
  userName: string;
}

export function SuspendUserDialog({
  userId,
  userName,
}: SuspendUserDialogProps) {
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
      const result = await suspendUserAction({ userId, reason: trimmed });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Usuario suspendido.");
      setOpen(false);
      setReason("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Ban className="mr-2 h-4 w-4" />
          Suspender usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspender usuario</DialogTitle>
          <DialogDescription>
            Estás por suspender a{" "}
            <span className="font-semibold text-foreground">{userName}</span>.
            No podrá iniciar sesión hasta que la suspensión sea levantada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Motivo (interno, no se envía al usuario)</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={3}
              maxLength={500}
              disabled={isPending}
              placeholder="Ej: cuenta inactiva por petición administrativa."
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
              {isPending ? "Suspendiendo..." : "Confirmar suspensión"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
