// Repositorio de forum_replies (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md 1009-1052): enrolled students y teachers
// del curso SELECT + INSERT; admins all. Sin UPDATE/DELETE por user
// (replies inmutables en MVP; admin via service role si modera).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { ReplyWithAuthor } from "../types";

type ForumReplyInsert =
  Database["public"]["Tables"]["forum_replies"]["Insert"];

export const replyRepository = {
  async listByThreadWithAuthor(
    threadId: string,
  ): Promise<ReplyWithAuthor[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_replies")
      .select("*, author:profiles!forum_replies_author_id_fkey(id, full_name, role)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []) as unknown as ReplyWithAuthor[];
  },

  async create(
    input: Pick<ForumReplyInsert, "thread_id" | "author_id" | "body">,
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("forum_replies").insert(input);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
