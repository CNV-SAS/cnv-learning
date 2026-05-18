// Repositorio de enrollments (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): users ven sus propios enrollments,
// teachers de sus cursos, admins todo. La policy "Users view own
// enrollments" hace el filtrado por auth.uid().

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Enrollment } from "../types";

export const enrollmentRepository = {
  async getActiveForUser(userId: string): Promise<Enrollment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
