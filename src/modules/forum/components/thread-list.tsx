// Lista de threads de un foro (Server Component). Orden definitivo
// (is_pinned desc, updated_at desc) viene del repo.
//
// Excerpt: strip naive de caracteres markdown comunes para no
// mostrar `#`, `*`, etc. en el preview. NO es render full de
// markdown; eso solo se hace en thread detail (PostBody, 9.4) para
// limitar el ruido visual en la lista.

import Link from "next/link";
import { Pin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ThreadWithAuthor } from "../types";

interface ThreadListProps {
  courseId: string;
  forumId: string;
  threads: ThreadWithAuthor[];
}

const MAX_EXCERPT_LEN = 160;

function bodyExcerpt(body: string): string {
  const plain = body
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/[#*_`>~[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_EXCERPT_LEN) return plain;
  return plain.slice(0, MAX_EXCERPT_LEN).trimEnd() + "…";
}

function roleLabel(role: ThreadWithAuthor["author"]["role"]): string | null {
  if (role === "teacher") return "Docente";
  if (role === "admin") return "Admin";
  return null;
}

export function ThreadList({ courseId, forumId, threads }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Todavía no hay posts en este foro. Sé el primero en publicar.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const role = roleLabel(thread.author.role);
        return (
          <Link
            key={thread.id}
            href={`/learn/${courseId}/forum/${forumId}/thread/${thread.id}`}
            className="block"
          >
            <Card className="p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  {thread.is_pinned && (
                    <Pin
                      className="mt-1 h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden
                    />
                  )}
                  <h3 className="font-display text-lg font-bold tracking-tight">
                    {thread.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {bodyExcerpt(thread.body)}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Por {thread.author.full_name}</span>
                  {role && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {role}
                    </Badge>
                  )}
                  <span>
                    Actualizado{" "}
                    {format(new Date(thread.updated_at), "d MMM y", {
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
