// Preview de leccion para docentes (Bloque 19.5).
// Renderiza la misma vista que ve el alumno (VideoEmbed,
// LessonContent, AttachmentList, LessonNav) pero:
//   - sin CompleteLessonButton (no se registra progreso en preview).
//   - con banner "Modo preview" visible.
//   - con breadcrumbs que vuelven al editor del modulo.
//   - LessonNav navega dentro de /teacher/.../preview/... para que el
//     docente pueda recorrer modulo por modulo sin salirse del modo.
//
// Auth: canEditCourseContent (admin o teacher asignado al curso).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  courseRepository,
  lessonRepository,
  lessonAttachmentRepository,
  moduleRepository,
} from "@/modules/courses/data";
import { canEditCourseContent } from "@/modules/courses/policies";
import { panelHomeFor, panelLabelFor } from "@/modules/auth/policies";
import { VideoEmbed } from "@/modules/courses/components/video-embed";
import { LessonContent } from "@/modules/courses/components/lesson-content";
import {
  AttachmentList,
  type AttachmentWithUrl,
} from "@/modules/courses/components/attachment-list";
import { LessonNav } from "@/modules/courses/components/lesson-nav";
import { lessonNavigationService } from "@/modules/courses/services/lesson-navigation";
import { requireUuidParam } from "@/lib/utils/params";

interface PreviewLessonPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function PreviewLessonPage({
  params,
}: PreviewLessonPageProps) {
  const raw = await params;
  const courseId = requireUuidParam(raw.courseId);
  const lessonId = requireUuidParam(raw.lessonId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const [course, lesson, isTeacherOfCourse] = await Promise.all([
    courseRepository.findById(courseId),
    lessonRepository.findById(lessonId),
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
    !lesson
  ) {
    notFound();
  }

  // Fetch del modulo para validar que la leccion pertenece a este
  // curso (defensa anti URL manipulation) y para el breadcrumb.
  const module = await moduleRepository.findById(lesson.module_id);
  if (!module || module.course_id !== courseId) {
    notFound();
  }

  const [rawAttachments, neighbors] = await Promise.all([
    lessonAttachmentRepository.listByLesson(lessonId),
    lessonNavigationService.getNeighbors(courseId, lesson.id),
  ]);

  const attachments: AttachmentWithUrl[] = (
    await Promise.all(
      rawAttachments.map(async (a) => {
        const signedUrl = await lessonAttachmentRepository.getSignedUrl(
          a.storage_path,
        );
        return signedUrl ? { attachment: a, signedUrl } : null;
      }),
    )
  ).filter((item): item is AttachmentWithUrl => item !== null);

  function previewUrlBuilder(c: string, l: string): string {
    return `/teacher/courses/${c}/preview/lesson/${l}`;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <nav
        aria-label="Ruta"
        className="text-xs font-black uppercase tracking-widest text-muted-foreground"
      >
        <Link href={panelHomeFor(user)} className="hover:text-foreground">
          {panelLabelFor(user)}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/teacher/courses/${courseId}/edit`}
          className="hover:text-foreground"
        >
          Editar contenido
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/teacher/courses/${courseId}/edit/modules/${module.id}`}
          className="hover:text-foreground"
        >
          Módulo {module.position}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Preview</span>
      </nav>

      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <Eye className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Modo preview.</strong> Estás viendo la lección
          como la ve el alumno. El progreso no se registra y los
          botones de completar están deshabilitados.
        </p>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          {lesson.title}
        </h1>
        {lesson.duration_minutes !== null && (
          <p className="text-sm text-muted-foreground">
            Duración estimada: {lesson.duration_minutes} min
          </p>
        )}
      </div>

      {lesson.video_url && <VideoEmbed videoUrl={lesson.video_url} />}

      {lesson.content_markdown && (
        <LessonContent content={lesson.content_markdown} />
      )}

      <AttachmentList attachments={attachments} />

      <LessonNav
        courseId={courseId}
        prev={neighbors.prev}
        next={neighbors.next}
        urlBuilder={previewUrlBuilder}
      />
    </div>
  );
}
