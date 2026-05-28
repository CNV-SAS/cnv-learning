// ModuleList: acordeon de modulos del curso con su progreso. Server
// Component que compone shadcn Accordion (Client). El pattern
// server-passed-as-children permite que las LessonLink hijas se
// rendericen en server sin propagar "use client".
//
// Bloque 5 sub-bloque 5.3 agrego ProgressBar size="sm" en cada
// trigger + icono Check emerald cuando el modulo esta 100%.
// Bloque 6 sub-bloque 6.4 extiende el shape con assignments del
// modulo + Set de submittedAssignmentIds para mostrar badge
// "Entregada" en el AssignmentLink. Separador <hr> entre lessons
// y assignments cuando ambos existen.

import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buildProgressLabel } from "@/modules/progress/lib";
import type { ModuleWithProgress } from "@/modules/progress/services/progress.service";
import type { Assignment } from "@/modules/assignments/types";
// Path directo, NO barrel: el barrel components/index.ts mezclaba
// Server (AssignmentLink, GradeDisplay) con Client (SubmitForm) y
// rompia el build con boundary violation. Eliminado en 6.4-fix.
import { AssignmentLink } from "@/modules/assignments/components/assignment-link";
import { LessonLink } from "./lesson-link";

export interface ModuleEntry extends ModuleWithProgress {
  assignments: Assignment[];
  // IDs de las assignments del modulo con submission existente del
  // user actual. Array (no Set) porque debe cruzar la frontera
  // Server -> Client al pasarse al Accordion (Client). El componente
  // lo convierte a Set internamente para lookup O(1).
  submittedAssignmentIds: ReadonlyArray<string>;
}

interface ModuleListProps {
  courseId: string;
  modules: ModuleEntry[];
}

export function ModuleList({ courseId, modules }: ModuleListProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {modules.map(
        ({
          module: mod,
          lessons,
          assignments,
          progress,
          submittedAssignmentIds,
        }) => {
          const submittedSet = new Set(submittedAssignmentIds);
          return (
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
                    label={buildProgressLabel(progress)}
                    size="sm"
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {lessons.length === 0 && assignments.length === 0 ? (
                  <p className="px-3 text-sm text-muted-foreground">
                    Este módulo aún no tiene contenido.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {lessons.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <LessonLink
                              courseId={courseId}
                              lesson={lesson}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    {lessons.length > 0 && assignments.length > 0 && (
                      <hr className="border-border" />
                    )}
                    {assignments.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {assignments.map((assignment) => (
                          <li key={assignment.id}>
                            <AssignmentLink
                              courseId={courseId}
                              assignment={assignment}
                              hasSubmission={submittedSet.has(assignment.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        },
      )}
    </Accordion>
  );
}
