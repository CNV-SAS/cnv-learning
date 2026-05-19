// ReplyList: render plano de replies. Server Component.
// EmptyState cuando no hay replies todavia.

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostBody } from "./post-body";
import type { ReplyWithAuthor } from "../types";

interface ReplyListProps {
  replies: ReplyWithAuthor[];
}

function roleLabel(role: ReplyWithAuthor["author"]["role"]): string | null {
  if (role === "teacher") return "Docente";
  if (role === "admin") return "Admin";
  return null;
}

export function ReplyList({ replies }: ReplyListProps) {
  if (replies.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Sé el primero en responder a este post.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {replies.map((reply) => {
        const role = roleLabel(reply.author.role);
        return (
          <Card key={reply.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {reply.author.full_name}
              </span>
              {role && (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {role}
                </Badge>
              )}
              <span>
                {format(new Date(reply.created_at), "d MMM y, HH:mm", {
                  locale: es,
                })}
              </span>
            </div>
            <PostBody body={reply.body} />
          </Card>
        );
      })}
    </div>
  );
}
