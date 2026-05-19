// Detalle de un foro: lista de threads ordenados por is_pinned desc
// + updated_at desc. Server Component.
//
// Guard explicito contra forumId valido pero perteneciente a otro
// curso: la RLS deja leer el forum si el user es enrolled o teacher
// del curso del foro, no del curso en URL. Si el courseId en URL no
// coincide con forum.course_id, 404 (URL malformada).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { forumRepository, threadRepository } from "@/modules/forum/data";
import { ThreadList } from "@/modules/forum/components/thread-list";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";

interface ForumDetailPageProps {
  params: Promise<{ courseId: string; forumId: string }>;
}

export default async function ForumDetailPage({
  params,
}: ForumDetailPageProps) {
  const { courseId: rawCourseId, forumId: rawForumId } = await params;
  const courseId = requireUuidParam(rawCourseId);
  const forumId = requireUuidParam(rawForumId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const forum = await forumRepository.findById(forumId);
  if (!forum || forum.course_id !== courseId) {
    notFound();
  }

  const threads = await threadRepository.listByForumWithAuthor(forumId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href={`/learn/${courseId}/forum`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a foros
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-black tracking-tight">
              {forum.title}
            </h1>
            {forum.description && (
              <p className="text-sm text-muted-foreground">
                {forum.description}
              </p>
            )}
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/learn/${courseId}/forum/${forumId}/new`}>
              <PencilLine className="mr-2 h-4 w-4" />
              Nuevo post
            </Link>
          </Button>
        </div>
      </div>
      <ThreadList
        courseId={courseId}
        forumId={forumId}
        threads={threads}
      />
    </div>
  );
}
