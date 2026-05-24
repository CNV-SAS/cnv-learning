"use client";

// SidebarLogoutButton (Bloque 21.1): boton de logout al pie del
// sidebar (prototipo Gildardo). Reusa el mismo flow del logout del
// UserDropdown: logoutAction + router.push(redirectTo) + refresh.
//
// Estilo destructive sutil: borde + bg semi-transparente + texto
// destructive. NO es un Button shadcn porque queremos el mismo
// shape (uppercase font-black tracking-widest) que los SidebarItem.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/modules/auth/server";

export function SidebarLogoutButton() {
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
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-black uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      <span>{loading ? "Cerrando..." : "Cerrar sesión"}</span>
    </button>
  );
}
