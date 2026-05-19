// Repositorio de announcements (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md 1056-1078):
//   - SELECT global: cualquier authenticated user.
//   - SELECT course: enrolled students o teachers del curso.
//   - INSERT course: teacher del curso con author_id=auth.uid().
//   - admin manage all (SELECT + INSERT + UPDATE + DELETE en todo).
//
// create() usa server client porque la RLS valida el author_id
// y la membership al curso (course scope). Para global solo admin
// pasa la RLS (admin manage). No usamos admin client porque
// queremos que la RLS sea la defensa final.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { Announcement } from "../types";

type AnnouncementInsert =
  Database["public"]["Tables"]["announcements"]["Insert"];

export const announcementRepository = {
  async create(
    input: Pick<
      AnnouncementInsert,
      "scope" | "course_id" | "author_id" | "title" | "body"
    >,
  ): Promise<Announcement> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert(input)
      .select("*")
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "Failed to create announcement",
      );
    }
    return data;
  },
};
