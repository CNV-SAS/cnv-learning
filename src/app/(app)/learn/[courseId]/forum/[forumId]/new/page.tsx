// Form para crear nuevo thread. Server Component que monta el
// ThreadForm (Client) en modo create. Tras success, ThreadForm
// hace router.push al thread recien creado.
//
// requireUuidParam aplica a courseId y forumId (sub-bloque 4.4-fix):
// URL malformada => 404 sin pegar al repo.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { forumRepository } from "@/modules/forum/data";
import { ThreadForm } from "@/modules/forum/components/thread-form";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";

interface NewThreadPageProps {
  params: Promise<{ courseId: string; forumId: string }>;
}

export default async function NewThreadPage({
  params,
}: NewThreadPageProps) {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
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
        <h1 className="font-display text-3xl font-black tracking-tight">
          Nuevo post en {forum.title}
        </h1>
      </div>
      <ThreadForm
        mode="create"
        courseId={courseId}
        forumId={forumId}
      />
    </div>
  );
}
