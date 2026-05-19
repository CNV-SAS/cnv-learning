// Vista del curso. Bloque 6 sub-bloque 6.4 agrega fetch de
// assignments del curso + submissions del user (bulk) para
// agruparlas por modulo y pasar al ModuleList con shape
// ModuleEntry, y un boton "Libro de notas" en el header que
// linkea a /learn/[courseId]/grades.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, Megaphone, MessageSquare } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { progressService } from "@/modules/progress/services/progress.service";
import {
  assignmentRepository,
  submissionRepository,
} from "@/modules/assignments/data";
import {
  ModuleList,
  type ModuleEntry,
} from "@/modules/courses/components/module-list";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";
import type { Assignment } from "@/modules/assignments/types";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  // Phase 1: modulos+lessons+progreso (servicio) y assignments del
  // curso en paralelo. Independientes a este punto.
  const [modulesWithProgress, allAssignments] = await Promise.all([
    progressService.getModulesWithProgress(user.id, courseId),
    assignmentRepository.listByCourse(courseId),
  ]);

  // Phase 2: submissions del user requieren los assignmentIds. Una
  // sola query bulk via .in() en el repo.
  const userSubmissions =
    allAssignments.length > 0
      ? await submissionRepository.listByAssignmentIdsForUser(
          allAssignments.map((a) => a.id),
          user.id,
        )
      : [];

  const assignmentsByModuleId = new Map<string, Assignment[]>();
  for (const a of allAssignments) {
    const list = assignmentsByModuleId.get(a.module_id) ?? [];
    list.push(a);
    assignmentsByModuleId.set(a.module_id, list);
  }
  const submittedAssignmentIdSet = new Set(
    userSubmissions.map((s) => s.assignment_id),
  );

  const moduleEntries: ModuleEntry[] = modulesWithProgress.map((entry) => {
    const moduleAssignments =
      assignmentsByModuleId.get(entry.module.id) ?? [];
    return {
      ...entry,
      assignments: moduleAssignments,
      submittedAssignmentIds: moduleAssignments
        .filter((a) => submittedAssignmentIdSet.has(a.id))
        .map((a) => a.id),
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-4">
          <h1 className="font-display text-3xl font-black tracking-tight">
            {course.title}
          </h1>
          <div className="ml-auto flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/learn/${courseId}/grades`}>
                <BookOpen className="mr-2 h-4 w-4" />
                Libro de notas
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/learn/${courseId}/forum`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Foros
              </Link>
            </Button>
            {(user.role === "teacher" || user.role === "admin") && (
              <Button asChild variant="outline">
                <Link href={`/teacher/announce?courseId=${courseId}`}>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Nuevo anuncio
                </Link>
              </Button>
            )}
          </div>
        </div>
        {course.description && (
          <p className="text-sm text-muted-foreground">
            {course.description}
          </p>
        )}
      </div>
      <ModuleList courseId={courseId} modules={moduleEntries} />
    </div>
  );
}
