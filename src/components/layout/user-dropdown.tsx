"use client";

// UserDropdown: avatar circular del header que abre menu con
// label (nombre + email), link al Perfil y opcion "Cerrar sesion".
//
// Bloque 16: muestra la foto del user si tiene avatar_url, fallback
// a iniciales con AvatarFallback. Link "Perfil" agregado (la ruta
// /profile ya existe desde Bloque 11; en Bloque 16 cobra mas
// sentido al permitir edicion).
//
// Patron de logout heredado del LogoutButton de Bloque 2:
// router.push(redirectTo) + router.refresh() para que el server
// component (app)/layout.tsx rehidrate sin user.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl: string | null;
}

export function UserDropdown({
  displayName,
  email,
  initials,
  avatarUrl,
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
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} />
            )}
            <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold" title={displayName}>
              {displayName}
            </span>
            {/* 23 smoke fix AJUSTE 2: emails largos (ej.
                cnvcorporate+teacher@gmail.com) tocaban el borde del
                dropdown sin padding. truncate + title hover preservan
                el email completo accesible. */}
            <span
              className="truncate text-xs text-muted-foreground"
              title={email}
            >
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
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
