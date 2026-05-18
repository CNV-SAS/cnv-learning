// Repositorio de courses (ARCHITECTURE.md regla dura 1: unico lugar
// donde se accede a public.courses desde codigo TypeScript).
//
// RLS aplicada: el server client respeta policies de courses (4 en
// total, DATABASE.md). En MVP los students solo ven cursos en los
// que estan enrolled via la policy "Enrolled users view their
// courses"; teachers via "Teachers view their assigned courses";
// admins ven todo.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Course } from "../types";

export const courseRepository = {
  async findById(id: string): Promise<Course | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Cursos en los que el user tiene enrollment activo. Join via
  // enrollments para resolver el match. En MVP el student tiene 1
  // curso pero el shape retornado preserva multi-curso para v2.
  async listForUser(userId: string): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("course:courses(*)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? [])
      .map((row) => row.course)
      .filter((c): c is Course => c !== null);
  },
};
