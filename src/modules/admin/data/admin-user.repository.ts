// Repositorio admin-user (ARCHITECTURE.md regla 1: unico lugar de
// acceso directo a Supabase para operaciones admin de usuarios).
//
// USA SERVICE ROLE (admin client) explicitamente porque:
//   1. supabase.auth.admin.* (createUser, deleteUser, updateUserById,
//      generateLink) requieren service role por definicion.
//   2. updates a profiles desde el panel admin (rol, etc.) ocurren
//      bypaseando RLS; la policy can-manage-users + can-change-role
//      del service ya autorizo al actor antes de llegar aqui.
//   3. count(admins) lo hacemos con admin client para no depender de
//      RLS y obtener una respuesta determinista (necesaria para el
//      anti-lockout guard de isLastAdmin).
//
// Justificacion alineada con SECURITY.md / admin.ts header: el
// header de admin.ts lista "Tareas administrativas masivas iniciadas
// por admin" como caso legitimo; gestion de usuarios es exactamente
// eso. auth.admin.* es ademas la unica forma tecnica de operar
// estas acciones.

import { createAdminClient } from "@/lib/supabase/admin";
import { InfrastructureError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import type { Profile, UserRole } from "@/modules/auth/types";

// Duracion del ban para suspendUser. 87600h = 10 anios. Reversible
// via unsuspendUser que pone ban_duration='none'. No usamos 'forever'
// porque Supabase no documenta esa keyword en su Admin API; horas
// es el formato canonico.
const SUSPENSION_DURATION_HOURS = "87600h";

export interface CreatedAuthUser {
  userId: string;
}

export interface AuthUserLookup {
  id: string;
  email: string | null;
  banned_until: string | null;
}

export const adminUserRepository = {
  // Lista todos los profiles ordenados por nombre. UI /admin/users la
  // consume. RLS NO aplica (admin client); ordering aqui para que el
  // service NO ordene en JS.
  async listAll(): Promise<Profile[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return data ?? [];
  },

  // Count de profiles con role='admin'. Usado por el guard
  // anti-lockout (isLastAdmin). MVP: cuenta por role del profile, no
  // verifica banned_until del auth.users (edge case con admin
  // suspendido + 1 admin activo queda fuera de scope del MVP, donde
  // la cohorte tiene 1-2 admins maximo).
  async countAdmins(): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
    return count ?? 0;
  },

  // Actualiza el rol de un profile. La policy can-change-role del
  // service ya valido anti-self + anti-lockout antes de llegar aqui.
  async updateProfileRole(userId: string, role: UserRole): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Update defensivo del profile tras createAuthUser. El trigger
  // handle_new_user (migracion 0002) lee raw_user_meta_data->>'role'
  // y 'full_name' al insertar, pero forzar el set aqui evita drift
  // si el trigger cambia o si la metadata se pierde.
  async setProfileFields(
    userId: string,
    fields: { full_name: string; role: UserRole },
  ): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", userId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Crea un user en auth.users via Admin API. email_confirm=true
  // omite el step de verificacion de email (el admin ya valido al
  // user offline). user_metadata se pasa al trigger handle_new_user
  // que crea la row en profiles con role+full_name correctos.
  //
  // La password se omite: el user setea su password via recovery
  // link enviado por separado (sendUserInvitationEmail). No
  // generamos password aleatoria intermedia: reduce surface area
  // (no hay password temporal flotando en memoria/logs).
  async createAuthUser(input: {
    email: string;
    fullName: string;
    role: UserRole;
  }): Promise<CreatedAuthUser> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        role: input.role,
      },
    });

    if (error || !data.user) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo crear el usuario en auth.users",
      );
    }
    return { userId: data.user.id };
  },

  // Hard delete via Admin API. FK cascade limpia profile y entidades
  // dependientes (enrollments, lesson_progress, submissions, etc.)
  // segun configuracion del schema. Los campos actor (audit_logs,
  // announcements, gradings, etc.) se preservan con SET NULL via la
  // migracion 0024.
  async deleteAuthUser(userId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Ban prolongado (10 anios) via auth.admin. El user no puede
  // login mientras esta banned. Reversible via unbanAuthUser.
  async banAuthUser(userId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: SUSPENSION_DURATION_HOURS,
    });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Levanta el ban. ban_duration='none' es el formato documentado
  // por Supabase para reset.
  async unbanAuthUser(userId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

    if (error) {
      throw new InfrastructureError(ErrorCodes.DATABASE_ERROR, error.message);
    }
  },

  // Genera un recovery link via Admin API. El user lo recibe por
  // email y al click hace verifyOtp + redirect a /reset-password
  // (mismo flow que forgot-password publico).
  //
  // Devolvemos el action_link directamente; el caller decide a quien
  // enviarlo (sendUserInvitationEmail / sendUserPasswordResetEmail).
  async generateRecoveryLink(input: {
    email: string;
    redirectTo: string;
  }): Promise<string> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: input.email,
      options: { redirectTo: input.redirectTo },
    });

    if (error || !data.properties?.action_link) {
      throw new InfrastructureError(
        ErrorCodes.DATABASE_ERROR,
        error?.message ?? "No se pudo generar el link de recuperacion",
      );
    }
    return data.properties.action_link;
  },

  // Lookup en auth.users por email. Usado por createUser para
  // detectar conflicto antes de intentar createAuthUser (mejor UX
  // que devolver error generico de Supabase). El admin client
  // expone listUsers; paginamos via email filter no soportado, asi
  // que iteramos pagina 1 (perPage:1) con filter email = exact
  // match no esta soportado directamente; usamos profiles.email
  // unique como proxy ya que el trigger garantiza paridad.
  async findProfileByEmail(email: string): Promise<Profile | null> {
    const supabase = createAdminClient();
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

  async findProfileById(id: string): Promise<Profile | null> {
    const supabase = createAdminClient();
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
};
