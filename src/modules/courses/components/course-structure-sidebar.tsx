// CourseStructureSidebar (Bloque 21.2, enfasis Gildardo): sidebar
// derecho que muestra la lista completa de modulos del curso. Se
// renderiza en /learn/[courseId] y en /learn/[courseId]/lesson/[id]
// para que el alumno tenga la estructura del programa siempre a
// la vista.
//
// Active state via activeModuleId: el modulo cuya lesson o pagina
// se esta viendo se resalta con fondo emerald solido + texto
// blanco. Resto: card con borde sutil.
//
// Layout responsivo: oculto en mobile (<lg) per A2 confirmada del
// planning. En mobile el alumno usa la nav vertical del modulo via
// la pagina principal.
//
// Server Component (sin estado). Hace una query a moduleRepository
// que respeta RLS por enrolled student.

import Link from "next/link";
import { moduleRepository } from "@/modules/courses/data";

interface CourseStructureSidebarProps {
  courseId: string;
  activeModuleId?: string | null;
}

export async function CourseStructureSidebar({
  courseId,
  activeModuleId,
}: CourseStructureSidebarProps) {
  const modules = await moduleRepository.listByCourse(courseId);

  if (modules.length === 0) return null;

  return (
    <aside className="hidden w-72 shrink-0 space-y-3 lg:block">
      <p className="px-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
        Estructura académica
      </p>
      <ul className="space-y-2">
        {modules.map((module) => {
          const isActive = module.id === activeModuleId;
          return (
            <li key={module.id}>
              <Link
                href={`/learn/${courseId}#module-${module.id}`}
                className={
                  isActive
                    ? "block rounded-xl bg-emerald-700 px-4 py-3 text-white shadow-sm transition-colors"
                    : "block rounded-xl border border-border bg-card px-4 py-3 text-foreground transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                }
              >
                <p
                  className={
                    isActive
                      ? "text-[10px] font-black uppercase tracking-widest text-emerald-100"
                      : "text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  }
                >
                  Módulo {module.position}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  {module.title}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
