// Pagina destino cuando un user autenticado intenta acceder a una ruta
// que su rol no permite (ej. student a /admin/*). El user sin sesion NO
// llega aqui (el middleware lo redirige a /login).

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center bg-card border rounded-2xl p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">No autorizado</h1>
          <p className="text-sm text-muted-foreground">
            No tienes permiso para acceder a esta sección. Si crees que
            es un error, contacta a soporte.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
