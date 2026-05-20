// Loading state durante navegacion entre rutas de (public): /verify,
// /privacy, /terms, /support. Header con wordmark + Footer siguen
// rendered por el layout; este componente reemplaza el <main>
// durante el fetch del Server Component.
//
// Skeleton minimal que aproxima la forma de las paginas legales
// (titulo + parrafos). Evita el flash blanco al navegar desde el
// footer entre /privacy <-> /terms <-> /support.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
