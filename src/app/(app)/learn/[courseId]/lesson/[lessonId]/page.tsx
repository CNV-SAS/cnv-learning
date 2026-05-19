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
import { progressService } from "@/modules/progress/services/progress.service";
import { BadgeDisplay } from "@/modules/progress/components";
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

  // Performance (sub-bloque 4.5-perf): paralelizar queries
  // independientes. Orden de latencias antes -> despues:
  //   user                   -> user
  //   course                 -> course + lesson  (Promise.all #1)
  //   lesson                 -> attachments + completed + neighbors
  //   attachments               (Promise.all #2)
  //   completed + neighbors  -> signed URLs (paralelo interno)
  //
  // De 6 latencias secuenciales a 4. Combinado con el fix de
  // getNeighbors (de 11 a 2 latencias internas), baja ~5s a ~1s
  // en dev con Supabase free tier.
  const [course, lesson] = await Promise.all([
    courseRepository.findById(courseId),
    lessonRepository.findById(lessonId),
  ]);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }
  if (!canViewLesson(user, { lessonExists: lesson !== null }) || !lesson) {
    notFound();
  }

  // Mega Promise.all: attachments, progreso y vecinos son
  // independientes una vez tenemos courseId/lessonId/userId.
  // courseSummary solo se calcula para student (los otros roles no
  // tienen progreso propio); el badge size=sm del header refleja el
  // nivel actual y se actualiza automaticamente tras router.refresh()
  // del CompleteLessonButton (criterio Bloque 11: badge cambia sin
  // refresh manual).
  const isStudent = user.role === "student";
  const [rawAttachments, completed, neighbors, courseSummary] =
    await Promise.all([
      lessonAttachmentRepository.listByLesson(lessonId),
      lessonProgressRepository.hasCompleted(user.id, lesson.id),
      lessonNavigationService.getNeighbors(courseId, lesson.id),
      isStudent
        ? progressService.getCourseSummary(user.id, courseId)
        : Promise.resolve(null),
    ]);

  // Resolver signed URLs en paralelo. getSignedUrl retorna null
  // cuando el archivo no existe en Storage (estado valido en dev:
  // el seed registra attachments con paths ficticios). Filtramos
  // los nulls; si todos fallan, AttachmentList recibe array vacio
  // y omite la seccion sin romper la pagina. TTL 15 min cubre
  // delta hasta el click (consideracion B del plan: NO cachear
  // URLs entre renders).
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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          {lesson.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {lesson.duration_minutes !== null && (
            <span>Duración estimada: {lesson.duration_minutes} min</span>
          )}
          {courseSummary && (
            <BadgeDisplay badge={courseSummary.badge} size="sm" />
          )}
        </div>
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
