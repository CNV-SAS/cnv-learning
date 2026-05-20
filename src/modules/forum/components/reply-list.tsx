// ReplyList: render plano de replies. Server Component.
// EmptyState cuando no hay replies todavia.

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { formatBogotaDateTimeShort } from "@/lib/utils/format-date";
import type { ReplyWithAuthor } from "../types";

interface ReplyListProps {
  replies: ReplyWithAuthor[];
}

function roleLabel(
  role: NonNullable<ReplyWithAuthor["author"]>["role"] | undefined,
): string | null {
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
        const authorName = reply.author?.full_name ?? "(Sin perfil)";
        const role = roleLabel(reply.author?.role);
        return (
          <Card key={reply.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {authorName}
              </span>
              {role && (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {role}
                </Badge>
              )}
              <span>{formatBogotaDateTimeShort(reply.created_at)}</span>
            </div>
            <MarkdownContent body={reply.body} />
          </Card>
        );
      })}
    </div>
  );
}
