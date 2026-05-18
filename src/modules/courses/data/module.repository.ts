// Repositorio de modules (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven modulos de sus
// cursos, teachers de sus assigned, admins todo. La query no necesita
// agregar filtros de auth: la policy hace el filtrado en SQL.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Module } from "../types";

export const moduleRepository = {
  async listByCourse(courseId: string): Promise<Module[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
