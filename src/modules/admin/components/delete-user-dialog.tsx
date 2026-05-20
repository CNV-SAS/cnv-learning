"use client";

// Dialog para eliminar (hard delete) un usuario. Requiere tipear el
// email del target en el input para confirmar (defensa contra
// clicks accidentales). El service valida la coincidencia.
//
// Tras success redirige a /admin/users (la entidad ya no existe).

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteUserAction } from "@/modules/admin/server/delete-user.action";

interface DeleteUserDialogProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function DeleteUserDialog({
  userId,
  userEmail,
  userName,
}: DeleteUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const expectedEmail = userEmail.toLowerCase();
  const typedEmail = confirmEmail.trim().toLowerCase();
  const matches = typedEmail === expectedEmail;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matches) {
      toast.error("El email no coincide.");
      return;
    }
    startTransition(async () => {
      const result = await deleteUserAction({
        userId,
        confirmEmail: typedEmail,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Usuario eliminado.");
      setOpen(false);
      setConfirmEmail("");
      router.push("/admin/users");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            Estás por eliminar permanentemente a{" "}
            <span className="font-semibold text-foreground">{userName}</span>.
            La cuenta y todos sus datos relacionados (inscripciones,
            entregas, certificados, hilos del foro) se borrarán. Los
            registros de auditoría se preservan con el actor anonimizado.
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="delete-confirm-email">
              Para confirmar, tipea el email del usuario:{" "}
              <span className="font-mono text-foreground">{userEmail}</span>
            </Label>
            <Input
              id="delete-confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              disabled={isPending}
              placeholder={userEmail}
              autoComplete="off"
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
            <Button type="submit" variant="destructive" disabled={isPending || !matches}>
              {isPending ? "Eliminando..." : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
