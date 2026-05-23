// Editor de contenidos del curso (Bloque 19 sub-bloques 19.1+19.2).
// 19.1: shell de auth + lista read-only.
// 19.2: CRUD modulos (crear, editar, eliminar con blocking, reorder).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, FileText, GraduationCap, Layers } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canEditCourseContent } from "@/modules/courses/policies";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { ModuleFormDialog } from "@/modules/courses/components/editor/module-form-dialog";
import { DeleteModuleDialog } from "@/modules/courses/components/editor/delete-module-dialog";
import { ReorderButtons } from "@/modules/courses/components/editor/reorder-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
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
    !canEditCourseContent(user, {
      courseExists: course !== null,
      isTeacherOfCourse,
    }) ||
    !course
  ) {
    notFound();
  }

  const modulesWithImpact =
    await courseContentEditorService.listModulesWithImpact(courseId);

  const weightSum = modulesWithImpact.reduce(
    (acc, entry) => acc + Number(entry.module.weight ?? 0),
    0,
  );
  const weightSumLabel = `${weightSum}%`;
  const weightSumOver = weightSum > 100;

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
        <span className="text-foreground">Editar contenido</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Editor de contenidos
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight">
            {course.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los módulos, lecciones y tareas del curso. Los
            cambios se reflejan inmediatamente para los estudiantes
            inscritos.
          </p>
        </div>
        <ModuleFormDialog mode="create" courseId={courseId} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            {modulesWithImpact.length} módulo
            {modulesWithImpact.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            Suma de pesos:{" "}
            <span
              className={
                weightSumOver
                  ? "font-semibold text-destructive"
                  : "font-semibold text-foreground"
              }
            >
              {weightSumLabel}
            </span>
            <span className="text-xs">
              {weightSumOver
                ? "(supera 100, ajusta antes de continuar)"
                : "(máximo 100)"}
            </span>
          </span>
        </CardContent>
      </Card>

      {modulesWithImpact.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Este curso aún no tiene módulos. Crea el primero para
            empezar a estructurar el contenido.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {modulesWithImpact.map((entry, idx) => (
            <li key={entry.module.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex items-start gap-4">
                    <ReorderButtons
                      moduleId={entry.module.id}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < modulesWithImpact.length - 1}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          Módulo {entry.module.position}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Peso {Number(entry.module.weight ?? 0)}
                        </span>
                      </div>
                      <h2 className="font-display text-lg font-bold tracking-tight">
                        {entry.module.title}
                      </h2>
                      {entry.module.description && (
                        <p className="text-sm text-muted-foreground">
                          {entry.module.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {entry.impact.lessonCount} lección
                          {entry.impact.lessonCount === 1 ? "" : "es"}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {entry.impact.assignmentCount} tarea
                          {entry.impact.assignmentCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/teacher/courses/${courseId}/edit/modules/${entry.module.id}`}
                      >
                        Gestionar lecciones
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <ModuleFormDialog
                      mode="edit"
                      courseId={courseId}
                      module={entry.module}
                    />
                    <DeleteModuleDialog
                      moduleId={entry.module.id}
                      moduleTitle={entry.module.title}
                      impact={entry.impact}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Para editar lecciones y tareas de un módulo, abre &quot;Gestionar lecciones&quot;.
      </p>
    </div>
  );
}
