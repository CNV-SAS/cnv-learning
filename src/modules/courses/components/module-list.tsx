// ModuleList: acordeon de modulos del curso con su progreso. Server
// Component que compone shadcn Accordion (Client). El pattern
// server-passed-as-children permite que las LessonLink hijas se
// rendericen en server sin propagar "use client".
//
// Bloque 5 sub-bloque 5.3 agrega ProgressBar size="sm" en cada
// trigger + icono Check emerald cuando el modulo esta 100% completo.
// La prop ahora es ModuleWithProgress[] del progress.service, en
// lugar del shape interno previo.

import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { ModuleWithProgress } from "@/modules/progress/services/progress.service";
import { LessonLink } from "./lesson-link";

interface ModuleListProps {
  courseId: string;
  modules: ModuleWithProgress[];
}

export function ModuleList({ courseId, modules }: ModuleListProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {modules.map(({ module: mod, lessons, progress }) => (
        <AccordionItem key={mod.id} value={mod.id}>
          <AccordionTrigger>
            <div className="flex w-full flex-col gap-2 pr-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Módulo {mod.position}
                  </span>
                  <span className="text-base font-semibold">
                    {mod.title}
                  </span>
                </div>
                {progress.percentage === 100 && (
                  <Check
                    className="h-5 w-5 shrink-0 text-emerald-600"
                    aria-label="Módulo completado"
                  />
                )}
              </div>
              <ProgressBar
                percentage={progress.percentage}
                label={`${progress.completedCount} de ${progress.totalCount} lecciones`}
                size="sm"
              />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {lessons.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">
                Este módulo aún no tiene lecciones.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <LessonLink courseId={courseId} lesson={lesson} />
                  </li>
                ))}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
