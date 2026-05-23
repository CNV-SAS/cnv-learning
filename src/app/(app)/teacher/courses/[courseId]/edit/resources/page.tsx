// Editor de recursos del curso (Bloque 20.2). Lista los recursos
// generales del curso + por modulo, con upload + delete. Stat bar
// arriba muestra "Usado X / 500 MB". Reusa canEditCourseContent
// para auth (el rol de "editar contenido" cubre tambien recursos
// en MVP; canEditCourseResources es identica policy).
//
// Breadcrumbs: Panel docente / Editar contenido / Recursos.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  courseRepository,
  moduleRepository,
} from "@/modules/courses/data";
import { canEditCourseResources } from "@/modules/courses/policies";
import { courseResourceService } from "@/modules/courses/services/course-resource.service";
import { CreateResourceDialog } from "@/modules/courses/components/editor/create-resource-dialog";
import { ResourceListItem } from "@/modules/courses/components/editor/resource-list-item";
import { StorageUsageBar } from "@/modules/courses/components/editor/storage-usage-bar";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

interface ResourcesPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const [course, isTeacherOfCourse] = await Promise.all([
    courseRepository.findById(courseId),
    user.role === "teacher"
      ? courseRepository.isTeacherOfCourse(user.id, courseId)
      : Promise.resolve(false),
  ]);

  if (
    !canEditCourseResources(user, {
      courseExists: course !== null,
      isTeacherOfCourse,
    }) ||
    !course
  ) {
    notFound();
  }

  // Listado agrupado + lista de modulos para mostrar titulos. Se
  // resuelve en paralelo para minimizar latencia.
  const [grouped, modules] = await Promise.all([
    courseResourceService.listByCourseGrouped(courseId),
    moduleRepository.listByCourse(courseId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <nav
        aria-label="Ruta"
        className="text-xs font-black uppercase tracking-widest text-muted-foreground"
      >
        <Link href="/teacher" className="hover:text-foreground">
          Panel docente
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/teacher/courses/${courseId}/edit`}
          className="hover:text-foreground"
        >
          Editar contenido
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Recursos</span>
      </nav>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Recursos
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {course.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Sube archivos descargables (PDF, DOCX, slides, audios) o agrega
          enlaces externos (grabaciones Zoom, Drive). Los recursos generales
          del curso son visibles para todos los alumnos enrolados.
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <StorageUsageBar usedBytes={grouped.totalSizeBytes} />
        </CardContent>
      </Card>

      {/* General del curso */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">
            General del curso
          </h2>
          <CreateResourceDialog courseId={courseId} moduleId={null} />
        </div>
        {grouped.general.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No hay recursos generales del curso todavía.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {grouped.general.map((resource) => (
              <li key={resource.id}>
                <ResourceListItem resource={resource} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Por módulo */}
      {modules.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Por módulo
          </h2>
          {modules.map((module) => {
            const moduleResources = grouped.byModule.get(module.id) ?? [];
            return (
              <div key={module.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Módulo {module.position}
                    </p>
                    <h3 className="font-display text-lg font-bold tracking-tight">
                      {module.title}
                    </h3>
                  </div>
                  <CreateResourceDialog
                    courseId={courseId}
                    moduleId={module.id}
                  />
                </div>
                {moduleResources.length === 0 ? (
                  <Card>
                    <CardContent className="py-4 text-center text-sm text-muted-foreground">
                      Sin recursos en este módulo.
                    </CardContent>
                  </Card>
                ) : (
                  <ul className="space-y-3">
                    {moduleResources.map((resource) => (
                      <li key={resource.id}>
                        <ResourceListItem resource={resource} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
