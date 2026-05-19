// Lista de foros de un curso (Server Component). Se invoca desde
// /learn/[courseId]/forum/page.tsx. Cada card es link al detalle
// del foro; trae thread_count y last_activity_at agregados por el
// repo (forumRepository.listByCourseWithStats).

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import type { ForumWithStats } from "../types";

interface ForumListProps {
  courseId: string;
  forums: ForumWithStats[];
}

export function ForumList({ courseId, forums }: ForumListProps) {
  if (forums.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No hay foros para este curso todavía.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {forums.map((forum) => (
        <Link
          key={forum.id}
          href={`/learn/${courseId}/forum/${forum.id}`}
          className="block"
        >
          <Card className="p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold tracking-tight">
                  {forum.title}
                </h3>
                {forum.description && (
                  <p className="text-sm text-muted-foreground">
                    {forum.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    {forum.thread_count === 1
                      ? "1 post"
                      : `${forum.thread_count} posts`}
                  </span>
                </div>
                {forum.last_activity_at && (
                  <span>
                    Última actividad:{" "}
                    {format(new Date(forum.last_activity_at), "d MMM y", {
                      locale: es,
                    })}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
