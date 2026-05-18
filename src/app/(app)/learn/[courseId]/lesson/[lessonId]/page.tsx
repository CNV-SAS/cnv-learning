// Vista de leccion (Bloque 4 sub-bloque 4.4). Server Component async
// que compone:
//   - Header: titulo + duracion estimada cuando esta disponible.
//   - VideoEmbed: iframe YouTube responsive si lesson.video_url.
//   - LessonContent: markdown renderizado si lesson.content_markdown.
//   - AttachmentList: PDFs descargables con signed URL (TTL 15 min).
//
// Double guard policy:
//   1. canViewCourse contra el courseId del param (early failure si
//      el user no tiene acceso al curso de raiz).
//   2. canViewLesson contra el lessonId (RLS valida la cadena
//      lesson -> module -> course -> enrollment).
//   Ambas se respaldan en RLS real; las policies dan claridad de
//   intencion y error temprano antes de fetch de attachments.
//
// Sub-bloque 4.5 agregara: boton marcar completada + nav prev/next.
// Por eso este page todavia no muestra controles al final.

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  courseRepository,
  lessonRepository,
  lessonAttachmentRepository,
} from "@/modules/courses/data";
import {
  canViewCourse,
  canViewLesson,
} from "@/modules/courses/policies";
import { VideoEmbed } from "@/modules/courses/components/video-embed";
import { LessonContent } from "@/modules/courses/components/lesson-content";
import {
  AttachmentList,
  type AttachmentWithUrl,
} from "@/modules/courses/components/attachment-list";
import { CompleteLessonButton } from "@/modules/courses/components/complete-lesson-button";
import { LessonNav } from "@/modules/courses/components/lesson-nav";
import { lessonNavigationService } from "@/modules/courses/services/lesson-navigation";
import { lessonProgressRepository } from "@/modules/progress/data";
import { requireUuidParam } from "@/lib/utils/params";

interface LessonPageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const raw = await params;
  const courseId = requireUuidParam(raw.courseId);
  const lessonId = requireUuidParam(raw.lessonId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const lesson = await lessonRepository.findById(lessonId);
  if (!canViewLesson(user, { lessonExists: lesson !== null }) || !lesson) {
    notFound();
  }

  // Resolver signed URLs en paralelo. Repos limpios: el page hace la
  // composicion (consideracion B del plan: NO cachear URLs entre
  // renders, generar al render con TTL holgado para el delta hasta
  // el click).
  //
  // getSignedUrl retorna null cuando el archivo no existe en Storage
  // (estado valido en dev: el seed registra attachments con paths
  // ficticios). Filtramos los nulls; si todos fallan, AttachmentList
  // recibe array vacio y se omite la seccion sin romper la pagina.
  const rawAttachments =
    await lessonAttachmentRepository.listByLesson(lessonId);
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

  // Estado de progreso + vecinos en paralelo (queries independientes).
  const [completed, neighbors] = await Promise.all([
    lessonProgressRepository.hasCompleted(user.id, lesson.id),
    lessonNavigationService.getNeighbors(courseId, lesson.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
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

      <CompleteLessonButton lessonId={lesson.id} completed={completed} />
      <LessonNav
        courseId={courseId}
        prev={neighbors.prev}
        next={neighbors.next}
      />
    </div>
  );
}
