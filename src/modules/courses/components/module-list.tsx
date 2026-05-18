// ModuleList: acordeon de modulos del curso con sus lecciones.
// Server Component que compone shadcn Accordion (Client). El pattern
// server-passed-as-children permite que las LessonLink hijas se
// rendericen en server sin necesidad de "use client" propagado.
//
// type="multiple" permite tener varios modulos abiertos simultaneamente;
// si Santiago prefiere single (uno solo abierto), cambiar a "single"
// con collapsible.

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Module, Lesson } from "../types";
import { LessonLink } from "./lesson-link";

export interface ModuleWithLessons {
  module: Module;
  lessons: Lesson[];
}

interface ModuleListProps {
  courseId: string;
  modules: ModuleWithLessons[];
}

export function ModuleList({ courseId, modules }: ModuleListProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {modules.map(({ module: mod, lessons }) => (
        <AccordionItem key={mod.id} value={mod.id}>
          <AccordionTrigger>
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Módulo {mod.position}
              </span>
              <span className="text-base font-semibold">{mod.title}</span>
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
