// Loading boundary granular para /admin/*. Smoke E2E round 3
// Diagnostico A: navegar entre /admin/users, /admin/audit, etc.
// usaba el loading global de /(app)/. Ahora cada salto dentro de
// admin muestra un skeleton tailored (back link + header + tabla)
// sin esperar a que el server resuelva la pagina entera.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
