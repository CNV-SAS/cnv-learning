// LessonLink: link a una leccion individual desde el ModuleList.
// Muestra titulo + duracion estimada cuando esta disponible. Server
// Component (no requiere interactividad: el active state de
// SidebarItem no aplica aqui, son links dentro de un acordeon).

import Link from "next/link";
import { Play } from "lucide-react";
import type { Lesson } from "../types";

interface LessonLinkProps {
  courseId: string;
  lesson: Lesson;
}

export function LessonLink({ courseId, lesson }: LessonLinkProps) {
  return (
    <Link
      href={`/learn/${courseId}/lesson/${lesson.id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <div className="flex items-center gap-3 text-foreground">
        <Play className="h-4 w-4 text-muted-foreground" />
        <span>{lesson.title}</span>
      </div>
      {lesson.duration_minutes !== null && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {lesson.duration_minutes} min
        </span>
      )}
    </Link>
  );
}
