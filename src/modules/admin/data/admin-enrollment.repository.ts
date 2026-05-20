// Repositorio admin-enrollment (ARCHITECTURE.md regla 1).
//
// USA SERVICE ROLE (admin client) explicitamente porque:
//   1. La policy can-manage-users del service ya valido al actor
//      antes de llegar aqui (admin only).
//   2. Inscripciones manuales son operacion privilegiada del panel
//      admin, no del estudiante (que no tiene UI para auto-inscri-
//      birse). Predictible sin depender de policies INSERT/UPDATE
//      de enrollments para admin.
//   3. listWithCourse via embedded join es trivial con admin
//      client; con server client + RLS dependeria del actor.

import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Database } from "@/types/database.generated";
import type { Enrollment } from "@/modules/enrollments/types";
import type { Course } from "@/modules/courses/types";

type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"];

export interface EnrollmentWithCourse {
  enrollment: Enrollment;
  course: Course;
}

export const adminEnrollmentRepository = {
  // Lista todos los enrollments del user (activos e historicos) con
  // el curso joineado. UI /admin/users/[id]/enrollments lo consume.
  async listForUserWithCourse(
    userId: string,
  ): Promise<EnrollmentWithCourse[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*, course:courses(*)")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }

    const result: EnrollmentWithCourse[] = [];
    for (const row of data ?? []) {
      if (!row.course) continue;
      const { course, ...enrollment } = row;
      result.push({
        enrollment: enrollment as Enrollment,
        course,
      });
    }
    return result;
  },

  // Verifica si existe enrollment (activo o no) para (user, course).
  // Usado por el service para detectar duplicados antes de insert.
  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  async findById(id: string): Promise<Enrollment | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Insert de un enrollment nuevo. is_active=true por defecto.
  // enrolled_by = actor.id queda en el row para auditoria local
  // (FK preserved con SET NULL si el admin se elimina, migracion
  // 0024).
  async create(input: {
    userId: string;
    courseId: string;
    enrolledBy: string;
  }): Promise<Enrollment> {
    const supabase = createAdminClient();
    const row: EnrollmentInsert = {
      user_id: input.userId,
      course_id: input.courseId,
      enrolled_by: input.enrolledBy,
      is_active: true,
    };
    const { data, error } = await supabase
      .from("enrollments")
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo crear el enrollment",
      );
    }
    return data;
  },

  // Reactiva un enrollment cancelado (is_active=true). Usado si el
  // admin re-inscribe a un user que ya tenia enrollment historico.
  async reactivate(enrollmentId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("enrollments")
      .update({ is_active: true })
      .eq("id", enrollmentId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Cancela un enrollment (soft delete). Preserva historia y lesson_-
  // progress / submissions del user en el curso. is_active=false
  // bloquea acceso del student al curso (policy "Enrolled users
  // view their courses" filtra por is_active).
  async cancel(enrollmentId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("enrollments")
      .update({ is_active: false })
      .eq("id", enrollmentId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },
};
