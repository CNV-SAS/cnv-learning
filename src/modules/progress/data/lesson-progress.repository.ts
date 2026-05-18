// Repositorio de lesson_progress (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md):
//  - SELECT: users ven su propio progress; teachers de sus cursos;
//    admins todo.
//  - INSERT: users marcan su propio progress en lecciones de cursos
//    enrolled (double check user_id = auth.uid() AND is_enrolled).
//
// markCompleted usa upsert con ignoreDuplicates (= ON CONFLICT DO
// NOTHING en SQL): si el progress ya existe para esta (user_id,
// lesson_id), no falla ni duplica (el unique constraint de la
// tabla garantiza la idempotencia, pero el ignoreDuplicates evita
// el round-trip de error).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";

export const lessonProgressRepository = {
  async hasCompleted(userId: string, lessonId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data !== null;
  },

  async markCompleted(userId: string, lessonId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: userId, lesson_id: lessonId },
        { onConflict: "user_id,lesson_id", ignoreDuplicates: true },
      );

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
