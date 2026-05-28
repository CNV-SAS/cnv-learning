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

export interface CreateCourseRow {
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
}

export interface UpdateCourseRow {
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_published: boolean;
}

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

  // Cursos en los que el user tiene enrollment activo Y el curso
  // esta publicado (Bloque 23 smoke fix). Join via enrollments para
  // resolver el match. En MVP el student tiene 1 curso pero el shape
  // retornado preserva multi-curso para v2.
  //
  // !inner + eq("courses.is_published", true) filtra los cursos en
  // borrador (decision Bloque 23 smoke): si un curso se despublica
  // mientras un student tiene enrollment activo, el student no lo ve
  // hasta que se vuelva a publicar. Las constancias y certificados
  // asociados a cursos despublicados se ocultan en consecuencia
  // (callers dashboard, /certificates, /profile usan este metodo);
  // aceptable para MVP donde el cohorte tiene 1 curso que arranca
  // publicado y se mantiene asi durante el ciclo.
  async listForUser(userId: string): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("enrollments")
      .select("course:courses!inner(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("courses.is_published", true);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? [])
      .map((row) => row.course)
      .filter((c): c is Course => c !== null);
  },

  // Cursos en los que un teacher tiene asignacion via course_teachers.
  // Diferente de listAllAccessible: este filtra estrictamente a la
  // asignacion, mientras que listAllAccessible incluye cursos
  // publicados que el teacher ve por "Authenticated users view
  // published courses". Usado por /teacher/announce para que el
  // teacher solo vea sus cursos elegibles para emitir anuncios.
  async listForTeacher(userId: string): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_teachers")
      .select("course:courses(*)")
      .eq("teacher_id", userId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (data ?? [])
      .map((row) => row.course)
      .filter((c): c is Course => c !== null);
  },

  // Verifica si un user es teacher del curso. Lee de course_teachers
  // via server client; RLS "Users view own teaching assignments"
  // permite que el teacher en cuestion vea su propia row (la admin
  // ve todas). Para otros callers (otro teacher curioso) la RLS
  // bloquea la SELECT y retorna count=0, lo cual es el comportamiento
  // correcto: no admite afirmar la asignacion ajena.
  //
  // Usado por canEmitCourseAnnouncement context resolver.
  async isTeacherOfCourse(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("course_teachers")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .eq("course_id", courseId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (count ?? 0) > 0;
  },

  // Lee el flag can_manage_course de course_teachers para el caller
  // sobre un curso. Si no hay row (teacher no asignado) o el flag es
  // false, retorna false. RLS "Users view own teaching assignments"
  // permite que el teacher consulte su propia row.
  //
  // Usado por canEditCourseMeta context resolver (Bloque 23.1).
  async getCourseTeacherFlag(
    userId: string,
    courseId: string,
  ): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_teachers")
      .select("can_manage_course")
      .eq("teacher_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data?.can_manage_course === true;
  },

  // Verifica si un slug ya esta tomado por otro curso. excludeId
  // opcional para flows de update donde el slug puede igualar al del
  // propio curso. Retorna true si ya existe (otro curso lo tiene).
  //
  // Usado por courseMetaService antes del INSERT/UPDATE para devolver
  // un error de dominio claro (COURSE_SLUG_TAKEN) en lugar del 23505
  // generico de la unique constraint a nivel SQL.
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const supabase = await createClient();
    let query = supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { count, error } = await query;
    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return (count ?? 0) > 0;
  },

  // Crear curso (admin-only por RLS "Admins manage courses").
  // is_published arranca en false (decision plan B23, el curso se
  // publica via updateCourse cuando este listo).
  //
  // El service hace el pre-check de slug + audit antes de llamar.
  async create(input: CreateCourseRow): Promise<Course> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .insert({
        title: input.title,
        slug: input.slug,
        description: input.description,
        cover_url: input.cover_url,
        is_published: false,
      })
      .select("*")
      .single();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Update de metadatos. RLS cubre:
  //   - admin: "Admins manage courses".
  //   - teacher con flag: "Teachers manage course meta with flag".
  async update(id: string, input: UpdateCourseRow): Promise<Course> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .update({
        title: input.title,
        slug: input.slug,
        description: input.description,
        cover_url: input.cover_url,
        is_published: input.is_published,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Cursos accesibles para el caller. RLS hace el filtrado real:
  // students ven sus enrolled (via policy "Enrolled users view
  // their courses"), teachers ven sus asignados (via "Teachers
  // view their assigned courses"), admins ven todo. Un solo
  // metodo sirve para los 3 roles sin if-by-role en la app layer.
  //
  // Usado por dashboard/page.tsx para teacher y admin (que no
  // tienen enrollments, sino asignaciones via course_teachers).
  // No se usa para student porque listForUser ya devuelve sus
  // enrolled y el join via enrollments es mas barato que el
  // select all + RLS para volumen MVP.
  async listAllAccessible(): Promise<Course[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("title", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },
};
