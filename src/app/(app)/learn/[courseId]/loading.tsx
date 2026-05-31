// Loading boundary granular para /learn/[courseId]/*. Smoke E2E
// round 3 Diagnostico A: navegar entre lessons, assignments, grades,
// resources, calendar y forum dentro del mismo curso muestra
// skeleton inmediato sin esperar a que el server cargue lecciones +
// progress + signed URLs.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-72" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
