// Repositorio de profiles (ARCHITECTURE.md 300-323, regla dura 1: unico
// lugar donde se accede a public.profiles desde codigo TypeScript).
//
// Usa el server client de Supabase (lib/supabase/server.ts) con RLS
// aplicado. Para acceder a profiles bypaseando RLS (caso muy excepcional)
// el caller deberia usar admin.ts y NO este repositorio.
//
// Convencion de errores:
// - Errores de Supabase (BD caida, query mal formada) -> throw
//   InfrastructureError(DATABASE_ERROR). Es excepcional y se propaga
//   a Sentry via error boundary.
// - Casos validos sin resultado (no sesion, profile no encontrado) ->
//   retorna null. El caller decide que significa (redirect a login,
//   404, etc.).

import { createClient } from "@/lib/supabase/server";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { AuthenticatedUser, Profile } from "@/modules/auth/types";

export const profileRepository = {
  async findById(id: string): Promise<Profile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Bulk fetch (usado por teacher inbox para resolver nombre del
  // estudiante de cada submission). RLS aplica: teachers ven enrolled
  // students de sus cursos (policy del Bloque 2.21). Profiles fuera
  // del filtro simplemente no vuelven; el caller filtra/maneja.
  async findByIds(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", ids);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async findByEmail(email: string): Promise<Profile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Lista todos los profiles con role='teacher'. Usado por
  // /admin/teachers. RLS "Admins can view all profiles" (0017)
  // permite a admin via server client; otros roles llegarian a [].
  async listTeachers(): Promise<Profile[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("full_name", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const supabase = await createClient();

    // auth.getUser() retorna user=null si no hay sesion valida. NO es
    // error de infraestructura; es valido y comun (rutas publicas,
    // primer load antes de login, etc.).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Query optimizada: solo los campos del Pick AuthenticatedUser.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data;
  },

  // Update parcial del propio profile (Bloque 16). Server client +
  // RLS "Users can update own profile" (migracion 0017) garantiza
  // que solo se actualiza la row WHERE id = auth.uid(). El service
  // pasa userId solo por explicitud + defensa en profundidad; la
  // RLS bloquea cualquier intento de pasar otro id.
  async updateOwnProfile(
    userId: string,
    fields: {
      full_name?: string;
      bio?: string | null;
      professional_license?: string | null;
      institution?: string | null;
      specialization?: string | null;
      avatar_url?: string | null;
    },
  ): Promise<Profile> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", userId)
      .select()
      .single();

    if (error || !data) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo actualizar el perfil",
      );
    }
    return data;
  },
};
