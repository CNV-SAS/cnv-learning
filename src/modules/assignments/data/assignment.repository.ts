// Repositorio de assignments (ARCHITECTURE.md regla dura 1).
//
// RLS aplicada (DATABASE.md): students enrolled ven assignments de
// sus cursos via join lessons -> modules; teachers de sus cursos;
// admins todo. La policy hace el filtrado SQL; el repo no agrega
// condiciones de auth.

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Assignment } from "../types";

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
