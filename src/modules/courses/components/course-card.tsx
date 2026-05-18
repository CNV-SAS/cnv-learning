// CourseCard: card del dashboard con curso enrolled + progreso +
// insignia + accion contextual segun nivel de completacion.
//
// Layout (Bloque 5 sub-bloque 5.3):
//   - Header: titulo + BadgeDisplay top-right.
//   - Descripcion line-clamp-3.
//   - ProgressBar con label "N de M lecciones" + porcentaje.
//   - Footer condicional segun progress.percentage:
//       0%       -> 1 boton "Entrar al curso".
//       1-99%    -> "Entrar al curso" (outline) + "Continuar donde
//                   dejaste" (primary, link a continueLesson).
//       100%     -> 1 boton "Revisar el curso".
//
// El "Revisar el curso" linkea al course view (no a una leccion
// especifica) porque el user decide que repasar. continueLesson es
// null cuando 100% por definicion (pickFirstUncompleted).

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/shared/progress-bar";
import { BadgeDisplay } from "@/modules/progress/components";
import type { CourseSummary } from "@/modules/progress/services/progress.service";
import type { Course } from "../types";

interface CourseCardProps {
  course: Course;
  summary: CourseSummary;
}

export function CourseCard({ course, summary }: CourseCardProps) {
  const { progress, badge, continueLesson } = summary;
  const isComplete = progress.percentage === 100;
  const isStarted = progress.percentage > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{course.title}</CardTitle>
          <BadgeDisplay badge={badge} size="sm" />
        </div>
        {course.description && (
          <CardDescription className="line-clamp-3">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressBar
          percentage={progress.percentage}
          label={`${progress.completedCount} de ${progress.totalCount} lecciones`}
          showPercentage
        />
        {isComplete ? (
          <Button asChild className="w-full">
            <Link href={`/learn/${course.id}`}>Revisar el curso</Link>
          </Button>
        ) : isStarted && continueLesson ? (
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link
                href={`/learn/${course.id}/lesson/${continueLesson.id}`}
              >
                Continuar donde dejaste
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/learn/${course.id}`}>Entrar al curso</Link>
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/learn/${course.id}`}>Entrar al curso</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
