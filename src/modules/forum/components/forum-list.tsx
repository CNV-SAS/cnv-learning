// Lista de foros de un curso (Server Component). Se invoca desde
// /learn/[courseId]/forum/page.tsx. Bloque 21.2 rediseno: grid 2x2
// de IconLinkCard (estilo prototipo Gildardo "Comunidad CNV").
// Cada card lleva icon emerald + titulo + descripcion + count de
// posts como subtitulo.

import { Brain, Coffee, Info, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconLinkCard } from "@/components/shared/icon-link-card";
import type { ForumWithStats } from "../types";

interface ForumListProps {
  courseId: string;
  forums: ForumWithStats[];
}

// Pool de iconos para asignar por slug. Slugs no listados caen al
// default (Users). Mantener corto: en MVP cohorte hay pocos foros.
const ICON_BY_SLUG: Record<string, React.ComponentType<{ className?: string }>> = {
  presentacion: Users,
  presentation: Users,
  intro: Users,
  casos: Brain,
  "casos-clinicos": Brain,
  dudas: Info,
  soporte: Info,
  ayuda: Info,
  cafeteria: Coffee,
  general: Coffee,
};

function getIconForSlug(slug: string) {
  const Icon = ICON_BY_SLUG[slug.toLowerCase()] ?? Users;
  return <Icon className="h-6 w-6" />;
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
    <div className="grid gap-4 sm:grid-cols-2">
      {forums.map((forum) => {
        const postLabel =
          forum.thread_count === 1
            ? "1 post"
            : `${forum.thread_count} posts`;
        const description = forum.description
          ? `${forum.description} · ${postLabel}`
          : postLabel;
        return (
          <IconLinkCard
            key={forum.id}
            icon={getIconForSlug(forum.slug)}
            title={forum.title}
            description={description}
            href={`/learn/${courseId}/forum/${forum.id}`}
          />
        );
      })}
    </div>
  );
}
