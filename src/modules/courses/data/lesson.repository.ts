// Repositorio de lessons (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven lessons de sus
// cursos via join con modules; teachers idem; admins todo. Para
// writes (Bloque 19.3): admin via policy "Admins manage lessons" +
// teacher asignado via policy "Teachers manage lessons of their
// courses" (migracion 0028). Service capa de policy filtra arriba;
// RLS es defense-in-depth.
//
// El orden global (modules.position -> lessons.position) requerido
// para navegacion prev/next entre lecciones NO vive aqui: se compone
// en modules/courses/services/lesson-navigation.ts orquestando dos
// queries simples (modules + lessons por modulo). Mantiene los repos
// triviales y la composicion explicita en service.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Lesson, LessonType } from "../types";

export interface CreateLessonInput {
  module_id: string;
  title: string;
  type: LessonType;
  content_markdown: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  position: number;
}

export interface UpdateLessonInput {
  title: string;
  type: LessonType;
  content_markdown: string | null;
  video_url: string | null;
  duration_minutes: number | null;
}

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

  async create(input: CreateLessonInput): Promise<Lesson> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async update(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  async maxPosition(moduleId: string): Promise<number | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.position ?? null;
  },

  async swapPositions(
    moduleId: string,
    posA: number,
    posB: number,
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("swap_lesson_positions", {
      p_module_id: moduleId,
      p_pos_a: posA,
      p_pos_b: posB,
    });
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
