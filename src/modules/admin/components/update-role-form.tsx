"use client";

// Form para cambiar el rol de un user. Select + Save inline. El
// service maneja anti-self + anti-lockout.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRoleAction } from "@/modules/admin/server/update-user-role.action";
import type { UserRole } from "@/modules/auth/types";

interface UpdateRoleFormProps {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}

export function UpdateRoleForm({
  userId,
  currentRole,
  disabled,
}: UpdateRoleFormProps) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (role === currentRole) {
      toast.info("El rol no ha cambiado.");
      return;
    }
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, role });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Rol actualizado.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2 min-w-48">
        <Label htmlFor={`role-${userId}`}>Rol</Label>
        <Select
          value={role}
          onValueChange={(v) => setRole(v as UserRole)}
          disabled={isPending || disabled}
        >
          <SelectTrigger id={`role-${userId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Estudiante</SelectItem>
            <SelectItem value="teacher">Docente</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isPending || disabled || role === currentRole}>
        {isPending ? "Guardando..." : "Guardar rol"}
      </Button>
    </form>
  );
}
