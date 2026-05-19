// Repositorio de forums (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled SELECT, teachers
// del curso SELECT, admins manage. Sin INSERT/UPDATE/DELETE por
// user (los foros se crean en seed o por admin via panel futuro).
//
// listByCourseWithStats: join con forum_threads para conteo y
// ultima actividad. Usado por ForumListPage. Aggregate via subquery
// porque Postgres no permite count() en select() con joins multi-row
// sin group by; el repo arma la lista en TS tras dos queries simples
// para mantener legibilidad sobre micro-optimizacion.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Forum, ForumWithStats } from "../types";

export const forumRepository = {
  async findById(id: string): Promise<Forum | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forums")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async findByCourseAndSlug(
    courseId: string,
    slug: string,
  ): Promise<Forum | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forums")
      .select("*")
      .eq("course_id", courseId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Foros del curso con thread_count y last_activity_at agregados.
  // Dos queries: forums por curso + threads agrupados por forum_id.
  // Para 2 foros y pocos threads en MVP, el roundtrip extra es
  // despreciable.
  async listByCourseWithStats(courseId: string): Promise<ForumWithStats[]> {
    const supabase = await createClient();
    const { data: forums, error: forumsError } = await supabase
      .from("forums")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true });

    if (forumsError) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        forumsError.message,
      );
    }
    if (!forums || forums.length === 0) return [];

    const forumIds = forums.map((f) => f.id);
    const { data: threads, error: threadsError } = await supabase
      .from("forum_threads")
      .select("forum_id, updated_at")
      .in("forum_id", forumIds);

    if (threadsError) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        threadsError.message,
      );
    }

    const statsByForumId = new Map<
      string,
      { count: number; lastActivity: string | null }
    >();
    for (const t of threads ?? []) {
      const prev = statsByForumId.get(t.forum_id) ?? {
        count: 0,
        lastActivity: null as string | null,
      };
      const nextLast =
        prev.lastActivity === null || t.updated_at > prev.lastActivity
          ? t.updated_at
          : prev.lastActivity;
      statsByForumId.set(t.forum_id, {
        count: prev.count + 1,
        lastActivity: nextLast,
      });
    }

    return forums.map((f) => {
      const stats = statsByForumId.get(f.id);
      return {
        ...f,
        thread_count: stats?.count ?? 0,
        last_activity_at: stats?.lastActivity ?? null,
      };
    });
  },
};
