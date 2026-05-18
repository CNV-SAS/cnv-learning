// 404 con marca. Server Component asincrono: consulta sesion del user
// para decidir el link de salida (dashboard si logueado, login si no).
//
// Cubre 404s no matched a nivel root. Si en bloques posteriores se
// necesita un 404 con shell completo (sidebar visible), se agrega un
// not-found.tsx dentro de (app)/.

import Link from "next/link";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const user = await profileRepository.getCurrentUser();
  const href = user ? "/dashboard" : "/login";
  const label = user ? "Volver al dashboard" : "Ir a iniciar sesión";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark variant="lg" />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Página no encontrada
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          La página que buscas no existe o se movió. Si llegaste aquí
          desde un link interno, repórtalo en soporte.
        </p>
      </div>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
