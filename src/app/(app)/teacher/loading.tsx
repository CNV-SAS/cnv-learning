// Loading boundary granular para /teacher/*. Smoke E2E round 3
// Diagnostico A: navegar entre /teacher/inbox, /teacher/grader/[id]
// y /teacher/students/[id] muestra feedback inmediato sin esperar
// el server (grader hace 5 queries en paralelo + signed URL,
// notablemente lento sin skeleton).

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
