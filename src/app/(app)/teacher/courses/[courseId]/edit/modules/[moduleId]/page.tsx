// Editor de lecciones del modulo (Bloque 19.3). Lista lecciones
// con reorder + edit + delete + create. Breadcrumbs:
//   Panel docente / Editar contenido / [Modulo]
//
// Auth: canEditCourseContent reusa el course_id resuelto via
// module.course_id. RLS de migracion 0028 cubre defense-in-depth.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FileVideo,
  FileText,
  Layers,
  Users,
} from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  courseRepository,
  moduleRepository,
} from "@/modules/courses/data";
import { canEditCourseContent } from "@/modules/courses/policies";
import { courseContentEditorService } from "@/modules/courses/services/course-content-editor.service";
import { LessonFormDialog } from "@/modules/courses/components/editor/lesson-form-dialog";
import { DeleteLessonDialog } from "@/modules/courses/components/editor/delete-lesson-dialog";
import { ReorderLessonButtons } from "@/modules/courses/components/editor/reorder-lesson-buttons";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

interface ModuleEditPageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  video: "Video",
  pdf: "PDF",
  mixed: "Mixto",
};

export default async function ModuleEditPage({ params }: ModuleEditPageProps) {
  const raw = await params;
  const courseId = requireUuidParam(raw.courseId);
  const moduleId = requireUuidParam(raw.moduleId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const [course, module, isTeacherOfCourse] = await Promise.all([
    courseRepository.findById(courseId),
    moduleRepository.findById(moduleId),
    user.role === "teacher"
      ? courseRepository.isTeacherOfCourse(user.id, courseId)
      : Promise.resolve(false),
  ]);

  if (
    !canEditCourseContent(user, {
      courseExists: course !== null,
      isTeacherOfCourse,
    }) ||
    !course ||
    !module ||
    module.course_id !== courseId
  ) {
    notFound();
  }

  const lessonsWithImpact =
    await courseContentEditorService.listLessonsWithImpact(moduleId);

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
        <span className="text-foreground">Módulo {module.position}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {course.title}
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight">
            {module.title}
          </h1>
          {module.description && (
            <p className="text-sm text-muted-foreground">
              {module.description}
            </p>
          )}
        </div>
        <LessonFormDialog mode="create" moduleId={moduleId} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            {lessonsWithImpact.length} lección
            {lessonsWithImpact.length === 1 ? "" : "es"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            Peso del módulo:{" "}
            <span className="font-semibold text-foreground">
              {Number(module.weight ?? 0)}
            </span>
          </span>
        </CardContent>
      </Card>

      {lessonsWithImpact.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Este módulo aún no tiene lecciones. Crea la primera para
            empezar.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {lessonsWithImpact.map((entry, idx) => (
            <li key={entry.lesson.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex items-start gap-4">
                    <ReorderLessonButtons
                      lessonId={entry.lesson.id}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < lessonsWithImpact.length - 1}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                          Lección {entry.lesson.position}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {TYPE_LABEL[entry.lesson.type] ?? entry.lesson.type}
                        </span>
                        {entry.lesson.duration_minutes !== null && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {entry.lesson.duration_minutes} min
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-bold tracking-tight">
                        {entry.lesson.title}
                      </h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {entry.lesson.video_url && (
                          <span className="flex items-center gap-1">
                            <FileVideo className="h-3 w-3" />
                            Video
                          </span>
                        )}
                        {entry.lesson.content_markdown && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Contenido markdown
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {entry.impact.progressCount} completaron
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LessonFormDialog
                      mode="edit"
                      moduleId={moduleId}
                      lesson={entry.lesson}
                    />
                    <DeleteLessonDialog
                      lessonId={entry.lesson.id}
                      lessonTitle={entry.lesson.title}
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
        Edición de tareas disponible desde 19.4.
      </p>
    </div>
  );
}
