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
}

export function LessonNav({ courseId, prev, next }: LessonNavProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {prev ? (
        <Button asChild variant="outline">
          <Link href={`/learn/${courseId}/lesson/${prev.id}`}>
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
          <Link href={`/learn/${courseId}/lesson/${next.id}`}>
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
