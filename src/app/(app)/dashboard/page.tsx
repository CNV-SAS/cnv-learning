// Dashboard placeholder del Bloque 2. El dashboard real (con sidebar,
// progreso, "continuar donde dejaste", insignia, etc.) se implementa
// en Bloques 3-5.
//
// Sirve como destino post-login y como pagina con LogoutButton para que
// el flujo login -> logout sea testeable end-to-end ahora.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  // Defensa en profundidad: el middleware ya redirige si no hay sesion,
  // pero verificamos aqui tambien (e.g. cache stale, race conditions).
  if (!user) redirect("/login");

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bienvenido, {user.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          Tu rol: <span className="font-medium">{user.role}</span>
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Dashboard placeholder del Bloque 2. La vista completa con sidebar,
        progreso e insignias se implementa en Bloques 3-5.
      </p>
      <LogoutButton />
    </div>
  );
}
