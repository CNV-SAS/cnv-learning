// Repositorio de lessons (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven lessons de sus
// cursos via join con modules; teachers idem; admins todo.
//
// El orden global (modules.position -> lessons.position) requerido
// para navegacion prev/next entre lecciones NO vive aqui: se compone
// en modules/courses/services/lesson-navigation.ts orquestando dos
// queries simples (modules + lessons por modulo). Mantiene los repos
// triviales y la composicion explicita en service.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Lesson } from "../types";

export const lessonRepository = {
  async findById(id: string): Promise<Lesson | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async listByModule(moduleId: string): Promise<Lesson[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("position", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
