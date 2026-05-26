"use client";

// Form para que el admin actualice el nombre completo de un user
// (Bloque 22.15). Input + Save inline. El service maneja policy
// canManageUsers + audit log + idempotencia.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserNameAction } from "@/modules/admin/server/update-user-name.action";

interface UpdateUserNameFormProps {
  userId: string;
  currentFullName: string;
}

export function UpdateUserNameForm({
  userId,
  currentFullName,
}: UpdateUserNameFormProps) {
  const [fullName, setFullName] = useState(currentFullName);
  const [isPending, startTransition] = useTransition();

  const trimmed = fullName.trim();
  const isDirty = trimmed !== currentFullName.trim();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isDirty) {
      toast.info("El nombre no ha cambiado.");
      return;
    }
    startTransition(async () => {
      const result = await updateUserNameAction({
        userId,
        fullName: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Nombre actualizado.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1 space-y-2">
        <Label htmlFor={`fullname-${userId}`}>Nombre completo</Label>
        <Input
          id={`fullname-${userId}`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending || !isDirty}>
        {isPending ? "Guardando..." : "Guardar nombre"}
      </Button>
    </form>
  );
}
