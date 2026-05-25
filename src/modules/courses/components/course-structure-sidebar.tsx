// CourseStructureSidebar (Bloque 21.2, ajustado 21.6 post-smoke):
// sidebar derecho que muestra la estructura completa del curso
// (modulos + lecciones) en el lesson view del student.
//
// 21.6 cambios:
//   - Removido del course view (/learn/[courseId]): duplicaba la
//     lista de modulos que el alumno ya ve en el flujo principal.
//   - Mostramos lecciones bajo cada modulo. Lecciones son Links a
//     /learn/[courseId]/lesson/[lessonId]. Modulos son headers
//     visuales NO clickeables (separadores entre lessons).
//   - activeLessonId resalta la leccion actual. activeModuleId
//     identifica el modulo padre como contexto.
//
// Layout responsivo: oculto en mobile (<lg). En mobile el alumno
// usa la nav prev/next del LessonNav.

import Link from "next/link";
import {
  lessonRepository,
  moduleRepository,
} from "@/modules/courses/data";

interface CourseStructureSidebarProps {
  courseId: string;
  activeLessonId?: string | null;
  activeModuleId?: string | null;
}

export async function CourseStructureSidebar({
  courseId,
  activeLessonId,
  activeModuleId,
}: CourseStructureSidebarProps) {
  const modules = await moduleRepository.listByCourse(courseId);
  if (modules.length === 0) return null;

  // Lecciones por modulo en paralelo. Para 10 modulos = 10 queries
  // simultaneas. Aceptable; si crece, sustituir por una sola query
  // con join.
  const lessonsByModule = await Promise.all(
    modules.map((m) => lessonRepository.listByModule(m.id)),
  );

  return (
    <aside className="hidden w-72 shrink-0 space-y-3 lg:block">
      <p className="px-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
        Estructura académica
      </p>
      <ul className="space-y-4">
        {modules.map((module, idx) => {
          const lessons = lessonsByModule[idx];
          const isActiveModule = module.id === activeModuleId;
          return (
            <li key={module.id} className="space-y-1">
              {/* Header del modulo: separador visual, NO clickeable
               * (21.6 C4: expand/collapse es post-MVP). */}
              <div
                className={
                  isActiveModule
                    ? "px-3 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                    : "px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                }
              >
                Módulo {module.position}: {module.title}
              </div>
              <ul className="space-y-1">
                {lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${courseId}/lesson/${lesson.id}`}
                        className={
                          isActive
                            ? "block rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                            : "block rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        }
                      >
                        {lesson.position}. {lesson.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
