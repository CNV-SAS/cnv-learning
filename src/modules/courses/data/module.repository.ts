// Repositorio de modules (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven modulos de sus
// cursos, teachers de sus assigned, admins todo. Para writes
// (Bloque 19.2): admin via policy "Admins manage modules" + teacher
// asignado via policy "Teachers manage modules of their courses"
// (migracion 0027). El service capa de policy filtra arriba; RLS
// es defense-in-depth.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Module } from "../types";

export interface CreateModuleInput {
  course_id: string;
  title: string;
  description: string | null;
  weight: number;
  position: number;
}

export interface UpdateModuleInput {
  title: string;
  description: string | null;
  weight: number;
}

export const moduleRepository = {
  async findById(id: string): Promise<Module | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

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

  async create(input: CreateModuleInput): Promise<Module> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("modules")
      .insert(input)
      .select("*")
      .single();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async update(id: string, input: UpdateModuleInput): Promise<Module> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("modules")
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
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Posicion maxima actual en el curso. Usado para append (nueva
  // posicion = max + 1). Null si el curso no tiene modulos (primer
  // modulo en posicion 1).
  async maxPosition(courseId: string): Promise<number | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("modules")
      .select("position")
      .eq("course_id", courseId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.position ?? null;
  },

  // Intercambia dos modulos del mismo curso atomicamente via RPC.
  // El RPC (migracion 0027) usa sentinel -1 transitorio para
  // sortear el unique (course_id, position) chequeado statement-end.
  async swapPositions(
    courseId: string,
    posA: number,
    posB: number,
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("swap_module_positions", {
      p_course_id: courseId,
      p_pos_a: posA,
      p_pos_b: posB,
    });
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
