// CourseCard: card del dashboard con curso accesible. Dos
// variantes segun el rol del caller:
//
//   - Con summary (CourseSummary): variante para student enrolled.
//     Layout original (Bloque 5 sub-bloque 5.3): titulo + Badge,
//     descripcion, ProgressBar, accion contextual segun progress
//     (0% / 1-99% / 100%).
//
//   - Sin summary (null): variante simplificada para teacher y
//     admin, que no tienen progreso propio en el curso. Solo
//     titulo + descripcion + boton "Ver curso". Decision del
//     ajuste de cierre del Bloque 9: una sola fuente de verdad
//     para "tus cursos" en el dashboard de los 3 roles.

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
  summary: CourseSummary | null;
}

export function CourseCard({ course, summary }: CourseCardProps) {
  if (summary === null) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-1">
          <CardTitle>{course.title}</CardTitle>
          {course.description && (
            <CardDescription className="line-clamp-3">
              {course.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/learn/${course.id}`}>Ver curso</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

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
