// Lista de foros del curso (presentacion + dudas en MVP).
// Server Component.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { forumRepository } from "@/modules/forum/data";
import { ForumList } from "@/modules/forum/components/forum-list";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";

interface ForumIndexPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function ForumIndexPage({
  params,
}: ForumIndexPageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const forums = await forumRepository.listByCourseWithStats(courseId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href={`/learn/${courseId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al curso
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Foros del curso
        </h1>
        <p className="text-sm text-muted-foreground">
          Espacios de conversación con tus compañeros y los docentes.
        </p>
      </div>
      <ForumList courseId={courseId} forums={forums} />
    </div>
  );
}
