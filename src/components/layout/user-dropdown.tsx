"use client";

// UserDropdown: avatar circular del header que abre menu con
// label (nombre + email) y opcion "Cerrar sesion". El item de
// Perfil esta omitido conscientemente hasta el Bloque 16 (no
// hay ruta /profile todavia; agregar link a 404 seria mal UX).
//
// Patron de logout heredado del LogoutButton de Bloque 2 (que
// se elimina en sub-bloque 3.4): router.push(redirectTo) +
// router.refresh() para que el server component (app)/layout.tsx
// rehidrate sin user y el proxy redirija a /login.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/modules/auth/server";

interface UserDropdownProps {
  displayName: string;
  email: string;
  initials: string;
}

export function UserDropdown({
  displayName,
  email,
  initials,
}: UserDropdownProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const result = await logoutAction();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.push(result.value.redirectTo);
      router.refresh();
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-full p-0"
          aria-label="Abrir menú de usuario"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            // Evita que el dropdown cierre antes del async; se cierra
            // sola tras router.push + refresh.
            e.preventDefault();
            handleLogout();
          }}
          disabled={loading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {loading ? "Cerrando sesión..." : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
