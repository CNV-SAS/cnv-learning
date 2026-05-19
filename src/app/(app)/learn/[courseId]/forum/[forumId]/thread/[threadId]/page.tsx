// Detalle de un thread: post + replies + form de reply. Server
// Component.
//
// Cadena de guards:
//   - courseId, forumId, threadId via requireUuidParam (404 si
//     URL malformada).
//   - canViewCourse (RLS + course exists).
//   - thread existe + forumId del thread coincide con URL.
//   - forumId existe + course_id del forum coincide con URL.
//     (defensa contra URLs mezcladas, p.ej. thread real pero
//     URL apunta a otro foro.)
//
// canEditThread se precomputa server-side y se pasa como prop al
// ThreadView (Client). RLS de UPDATE valida author = auth.uid()
// como ultima linea.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import {
  forumRepository,
  threadRepository,
  replyRepository,
} from "@/modules/forum/data";
import { canEditThread } from "@/modules/forum/policies";
import { ThreadView } from "@/modules/forum/components/thread-view";
import { ReplyList } from "@/modules/forum/components/reply-list";
import { ReplyForm } from "@/modules/forum/components/reply-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";

interface ThreadDetailPageProps {
  params: Promise<{
    courseId: string;
    forumId: string;
    threadId: string;
  }>;
}

export default async function ThreadDetailPage({
  params,
}: ThreadDetailPageProps) {
  const {
    courseId: rawCourseId,
    forumId: rawForumId,
    threadId: rawThreadId,
  } = await params;
  const courseId = requireUuidParam(rawCourseId);
  const forumId = requireUuidParam(rawForumId);
  const threadId = requireUuidParam(rawThreadId);

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

  const thread = await threadRepository.findByIdWithAuthor(threadId);
  if (!thread || thread.forum_id !== forumId) {
    notFound();
  }

  const replies = await replyRepository.listByThreadWithAuthor(threadId);
  const canEdit = canEditThread(user, {
    threadExists: true,
    authorId: thread.author_id,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-muted-foreground"
      >
        <Link href={`/learn/${courseId}/forum/${forumId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al foro
        </Link>
      </Button>

      <ThreadView
        thread={thread}
        courseId={courseId}
        forumId={forumId}
        canEdit={canEdit}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          {replies.length === 1
            ? "1 respuesta"
            : `${replies.length} respuestas`}
        </h2>
        <ReplyList replies={replies} />
      </section>

      <Card className="p-4">
        <ReplyForm
          courseId={courseId}
          forumId={forumId}
          threadId={threadId}
        />
      </Card>
    </div>
  );
}
