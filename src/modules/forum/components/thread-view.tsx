"use client";

// ThreadView: wrapper del thread principal. Mantiene estado local
// "editing" para alternar entre PostBody (default) y ThreadForm en
// modo edit inline.
//
// canEdit lo decide el server (page) via canEditThread policy. Si
// es false, el boton "Editar" no se renderiza y el toggle es
// inalcanzable desde UI; RLS sigue siendo la defensa real.

import { useState } from "react";
import { Pencil, Pin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostBody } from "./post-body";
import { ThreadForm } from "./thread-form";
import type { ThreadWithAuthor } from "../types";

interface ThreadViewProps {
  thread: ThreadWithAuthor;
  courseId: string;
  forumId: string;
  canEdit: boolean;
}

function roleLabel(
  role: NonNullable<ThreadWithAuthor["author"]>["role"] | undefined,
): string | null {
  if (role === "teacher") return "Docente";
  if (role === "admin") return "Admin";
  return null;
}

export function ThreadView({
  thread,
  courseId,
  forumId,
  canEdit,
}: ThreadViewProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ThreadForm
        mode="edit"
        courseId={courseId}
        forumId={forumId}
        threadId={thread.id}
        initialTitle={thread.title}
        initialBody={thread.body}
        onCancel={() => setEditing(false)}
        onSuccess={() => setEditing(false)}
      />
    );
  }

  const authorName = thread.author?.full_name ?? "(Sin perfil)";
  const role = roleLabel(thread.author?.role);
  const wasEdited = thread.updated_at !== thread.created_at;

  return (
    <article className="space-y-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          {thread.is_pinned && (
            <Pin
              className="mt-2 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden
            />
          )}
          <h1 className="font-display text-3xl font-black tracking-tight">
            {thread.title}
          </h1>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-8"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Por {authorName}</span>
          {role && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {role}
            </Badge>
          )}
          <span>
            {format(new Date(thread.created_at), "d MMM y", { locale: es })}
          </span>
          {wasEdited && (
            <span>
              · Editado el{" "}
              {format(new Date(thread.updated_at), "d MMM y", { locale: es })}
            </span>
          )}
        </div>
      </header>
      <PostBody body={thread.body} />
    </article>
  );
}
