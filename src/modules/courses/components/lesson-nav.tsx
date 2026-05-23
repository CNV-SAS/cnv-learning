// Botones Anterior/Siguiente de navegacion entre lecciones. Server
// Component: recibe prev/next ya resueltos (null en los extremos)
// del lessonNavigationService.getNeighbors. No tiene estado propio.
//
// Disabled cuando prev/next es null (estamos en el primero o
// ultimo del curso). Variante outline para no competir con el
// boton primary de "marcar completada".

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson } from "../types";

interface LessonNavProps {
  courseId: string;
  prev: Lesson | null;
  next: Lesson | null;
  // Callback opcional para construir las URLs prev/next. Default: la
  // ruta del estudiante /learn/[courseId]/lesson/[lessonId]. La
  // preview del docente (Bloque 19.5) pasa un builder distinto para
  // mantener la navegacion dentro de /teacher/.../preview/...
  urlBuilder?: (courseId: string, lessonId: string) => string;
}

function defaultUrlBuilder(courseId: string, lessonId: string): string {
  return `/learn/${courseId}/lesson/${lessonId}`;
}

export function LessonNav({
  courseId,
  prev,
  next,
  urlBuilder = defaultUrlBuilder,
}: LessonNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {prev ? (
        <Button asChild variant="outline">
          <Link href={urlBuilder(courseId, prev.id)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
      )}
      {next ? (
        <Button asChild variant="outline">
          <Link href={urlBuilder(courseId, next.id)}>
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Siguiente
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
