// Repositorio de forum_threads (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md 962-1004): enrolled students y teachers
// del curso SELECT + INSERT; autores UPDATE de sus threads; admins
// all. Sin DELETE por user.
//
// listByForumWithAuthor: lista plana de threads con autor embedded.
// Orden is_pinned desc + updated_at desc, segun plan del Bloque 9.
// Reply count se computa via subquery en el caller (page) si se
// necesita; aqui solo threads para mantener el repo simple.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { ForumThread, ThreadWithAuthor } from "../types";

type ForumThreadInsert =
  Database["public"]["Tables"]["forum_threads"]["Insert"];
type ForumThreadUpdate =
  Database["public"]["Tables"]["forum_threads"]["Update"];

export const threadRepository = {
  async findById(id: string): Promise<ForumThread | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async findByIdWithAuthor(id: string): Promise<ThreadWithAuthor | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .select("*, author:profiles!forum_threads_author_id_fkey(id, full_name, role)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    if (!data) return null;
    // El join inner-style retorna author como objeto plain.
    return data as unknown as ThreadWithAuthor;
  },

  async listByForumWithAuthor(forumId: string): Promise<ThreadWithAuthor[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .select("*, author:profiles!forum_threads_author_id_fkey(id, full_name, role)")
      .eq("forum_id", forumId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? []) as unknown as ThreadWithAuthor[];
  },

  async create(
    input: Pick<ForumThreadInsert, "forum_id" | "author_id" | "title" | "body">,
  ): Promise<ForumThread> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .insert(input)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create forum thread",
      );
    }
    return data;
  },

  // Update de title + body por el autor. La RLS policy "Authors
  // update own threads" valida author_id = auth.uid(); aqui no
  // agregamos filtro defensivo (RLS es la fuente de verdad). El
  // trigger updated_at de 0016 actualiza el timestamp.
  async update(
    id: string,
    input: Pick<ForumThreadUpdate, "title" | "body">,
  ): Promise<ForumThread> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to update forum thread",
      );
    }
    return data;
  },
};
