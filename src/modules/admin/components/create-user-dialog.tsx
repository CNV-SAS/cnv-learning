"use client";

// Dialog para crear un nuevo usuario desde /admin/users. Form con
// email + full_name + role (select). Al submit llama createUserAction
// que dispara invitacion via email (recovery link).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAction } from "@/modules/admin/server/create-user.action";
import type { UserRole } from "@/modules/auth/types";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setFullName("");
    setRole("student");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createUserAction({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Usuario creado. Se envió el email de invitación.");
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Se enviará un email de invitación al destinatario con un
            enlace para configurar su contraseña. El enlace es válido
            por 1 hora.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
              placeholder="usuario@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-name">Nombre completo</Label>
            <Input
              id="new-user-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
              placeholder="Nombre y apellidos"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user-role">Rol</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isPending}
            >
              <SelectTrigger id="new-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="teacher">Docente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
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
              {isPending ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
