"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/server";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const result = await logoutAction();
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    router.push(result.value.redirectTo);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={loading}>
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}
