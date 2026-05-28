// Repositorio de assignments (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven assignments de
// sus cursos via join lessons -> modules; teachers de sus cursos;
// admins todo. La policy hace el filtrado SQL; el repo no agrega
// condiciones de auth.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Assignment, AssignmentType } from "../types";

export interface CreateAssignmentInput {
  module_id: string;
  title: string;
  description: string | null;
  type: AssignmentType;
  due_at: string | null;
  max_score: number;
  is_required: boolean;
  // Bloque post-23 ISSUE 3: 0 = ilimitados, N > 0 = el alumno solo
  // puede entregar N veces.
  max_attempts: number;
}

export interface UpdateAssignmentInput {
  title: string;
  description: string | null;
  type: AssignmentType;
  due_at: string | null;
  max_score: number;
  is_required: boolean;
  max_attempts: number;
}

export const assignmentRepository = {
  async findById(id: string): Promise<Assignment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Assignments de un modulo especifico (para AssignmentLink en el
  // ModuleList accordion). Ordenadas por created_at (asignacion
  // simple en MVP; en v2 con custom ordering se agregara position).
  async listByModule(moduleId: string): Promise<Assignment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assignments")
      .insert(input)
      .select("*")
      .single();
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async update(
    id: string,
    input: UpdateAssignmentInput,
  ): Promise<Assignment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assignments")
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
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Todas las assignments del curso ordenadas por (module.position,
  // assignment.created_at). Usada por el libro de notas (caller hace
  // composicion con submissions y gradings).
  async listByCourse(courseId: string): Promise<Assignment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assignments")
      .select("*, modules!inner(course_id, position)")
      .eq("modules.course_id", courseId)
      .order("position", { foreignTable: "modules", ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    // El join trae campos extra de modules que no estan en Assignment.
    // Cast a Assignment[] subsumen los campos extra sin perdida.
    return (data ?? []) as unknown as Assignment[];
  },
};
