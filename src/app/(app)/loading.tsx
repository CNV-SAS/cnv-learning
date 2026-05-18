// Loading state real durante navegacion entre rutas de (app). El
// layout (sidebar + header) sigue rendered por arriba; este componente
// reemplaza solo el contenido del <main> via el Suspense boundary que
// Next.js coloca automaticamente alrededor de cada page.
//
// Skeleton generico que aproxima la forma de las paginas mas comunes
// (saludo + cards). Una sola plantilla evita drift cuando las paginas
// individuales cambian; si una ruta necesita un loading especifico, se
// agrega su propio loading.tsx en ese segment.

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
