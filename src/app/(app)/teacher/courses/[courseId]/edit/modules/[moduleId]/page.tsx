// Editor de modulo (Bloque 19.3 + 19.4). Dos secciones:
//   - Lecciones: CRUD + reorder (19.3).
//   - Tareas: CRUD sin reorder (19.4).
// Breadcrumbs: Panel docente / Editar contenido / [Modulo]
//
// Auth: canEditCourseContent reusa el course_id resuelto via
// module.course_id. RLS de migraciones 0028 (lessons) y 0029
// (assignments) cubren defense-in-depth.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CalendarClock,
  Eye,
  FileText,
  FileVideo,
  GraduationCap,
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
import { AssignmentFormDialog } from "@/modules/courses/components/editor/assignment-form-dialog";
import { DeleteAssignmentDialog } from "@/modules/courses/components/editor/delete-assignment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";
import { formatBogotaDateTimeShort } from "@/lib/utils/format-date";

interface ModuleEditPageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
}

// Labels orientados al docente. El enum en BD sigue siendo
// {video, pdf, mixed}: "pdf" significa solo contenido de texto
// (sin video; el editor de attachments PDF reales vive en B20).
const LESSON_TYPE_LABEL: Record<string, string> = {
  video: "Video",
  pdf: "Solo texto",
  mixed: "Video y texto",
};

const ASSIGNMENT_TYPE_LABEL: Record<string, string> = {
  file_upload: "Archivo",
  essay: "Ensayo",
  quiz_multiple_choice: "Quiz",
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

  const [lessonsWithImpact, assignmentsWithImpact] = await Promise.all([
    courseContentEditorService.listLessonsWithImpact(moduleId),
    courseContentEditorService.listAssignmentsWithImpact(moduleId),
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
        <span className="text-foreground">Módulo {module.position}</span>
      </nav>

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

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            {lessonsWithImpact.length} lección
            {lessonsWithImpact.length === 1 ? "" : "es"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            {assignmentsWithImpact.length} tarea
            {assignmentsWithImpact.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            Peso del módulo:{" "}
            <span className="font-semibold text-foreground">
              {Number(module.weight ?? 0)}
            </span>
          </span>
        </CardContent>
      </Card>

      {/* Lecciones */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Lecciones
          </h2>
          <LessonFormDialog mode="create" moduleId={moduleId} />
        </div>

        {lessonsWithImpact.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Este módulo aún no tiene lecciones.
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
                            {LESSON_TYPE_LABEL[entry.lesson.type] ??
                              entry.lesson.type}
                          </span>
                          {entry.lesson.duration_minutes !== null && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {entry.lesson.duration_minutes} min
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold tracking-tight">
                          {entry.lesson.title}
                        </h3>
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
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/teacher/courses/${courseId}/preview/lesson/${entry.lesson.id}`}
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Preview
                        </Link>
                      </Button>
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
      </section>

      {/* Tareas */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Tareas
          </h2>
          <AssignmentFormDialog mode="create" moduleId={moduleId} />
        </div>

        {assignmentsWithImpact.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Este módulo aún no tiene tareas.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {assignmentsWithImpact.map((entry) => (
              <li key={entry.assignment.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {ASSIGNMENT_TYPE_LABEL[entry.assignment.type] ??
                            entry.assignment.type}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {Number(entry.assignment.max_score)} pts
                        </span>
                        {entry.assignment.is_required && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            Obligatoria
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold tracking-tight">
                        {entry.assignment.title}
                      </h3>
                      {entry.assignment.description && (
                        <p className="text-sm text-muted-foreground">
                          {entry.assignment.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {entry.assignment.due_at && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            Plazo:{" "}
                            {formatBogotaDateTimeShort(
                              entry.assignment.due_at,
                            )}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {entry.impact.submissionCount} entrega
                          {entry.impact.submissionCount === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1">
                          {entry.impact.gradingCount} calificación
                          {entry.impact.gradingCount === 1 ? "" : "es"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AssignmentFormDialog
                        mode="edit"
                        moduleId={moduleId}
                        assignment={entry.assignment}
                      />
                      <DeleteAssignmentDialog
                        assignmentId={entry.assignment.id}
                        assignmentTitle={entry.assignment.title}
                        impact={entry.impact}
                      />
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
