// Service: orquestador de gestion del perfil del usuario autenticado
// (Bloque 16). ARCHITECTURE.md regla 2 (action thin -> service).
//
// 4 operaciones:
//   1. updateProfile: 6 campos editables. Sin audit (no critico,
//      regla 8 reserva audit para eventos criticos).
//   2. updateAvatar: persiste URL devuelta por el componente cliente
//      tras subir blob a Supabase Storage. Sin audit.
//   3. removeAvatar: avatar_url=null + best-effort delete del blob
//      previo en Storage. Fault-tolerant (si Storage falla, la
//      columna queda en null igual; consideracion I del plan).
//   4. changePassword: verifica current_password via cliente
//      no persistente (consideracion A1), luego actualiza via
//      sesion normal del user. AUDIT user.password_changed (regla 8;
//      es evento de seguridad).

import { createClient } from "@/lib/supabase/server";
import { createVerifyClient } from "@/lib/supabase/verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  canEditOwnProfile,
  canChangeOwnPassword,
} from "@/modules/profile/policies";
import { auditRepository } from "@/modules/audit/data";
import { isSamePasswordError } from "@/modules/auth/utils/password-errors";
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Profile } from "@/modules/auth/types";

interface UpdateProfileParams {
  actor: AuthenticatedUser;
  fullName: string;
  bio?: string;
  professionalLicense?: string;
  institution?: string;
  specialization?: string;
}

interface UpdateAvatarParams {
  actor: AuthenticatedUser;
  avatarUrl: string;
}

interface RemoveAvatarParams {
  actor: AuthenticatedUser;
}

interface ChangePasswordParams {
  actor: AuthenticatedUser;
  currentPassword: string;
  newPassword: string;
}

function authzCannotEdit(): AuthorizationError {
  // Defensive: las policies de profile son trivial true para los 3
  // roles. Si en v2 se restringen y la policy bloquea, este es el
  // mensaje generico.
  return new AuthorizationError(
    ErrorCodes.AUTHZ_ROLE_REQUIRED,
    "No puedes editar este perfil.",
  );
}

// Extrae el path interno del bucket 'avatars' desde una URL publica.
// URL formato:
//   https://<project>.supabase.co/storage/v1/object/public/avatars/{user_id}/{uuid}.{ext}
// Devuelve {user_id}/{uuid}.{ext} o null si la URL no parsea.
function extractAvatarPath(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/avatars\/(.+)$/);
  return match ? match[1] : null;
}

export const profileService = {
  async updateProfile(
    params: UpdateProfileParams,
  ): Promise<Result<Profile, AppError>> {
    if (!canEditOwnProfile(params.actor)) {
      return err(authzCannotEdit());
    }

    const updated = await profileRepository.updateOwnProfile(
      params.actor.id,
      {
        full_name: params.fullName,
        bio: params.bio ?? null,
        professional_license: params.professionalLicense ?? null,
        institution: params.institution ?? null,
        specialization: params.specialization ?? null,
      },
    );

    return ok(updated);
  },

  async updateAvatar(
    params: UpdateAvatarParams,
  ): Promise<Result<Profile, AppError>> {
    if (!canEditOwnProfile(params.actor)) {
      return err(authzCannotEdit());
    }

    const updated = await profileRepository.updateOwnProfile(
      params.actor.id,
      { avatar_url: params.avatarUrl },
    );

    return ok(updated);
  },

  async removeAvatar(
    params: RemoveAvatarParams,
  ): Promise<Result<Profile, AppError>> {
    if (!canEditOwnProfile(params.actor)) {
      return err(authzCannotEdit());
    }

    // Lookup actual para conocer el path del blob a borrar.
    const current = await profileRepository.findById(params.actor.id);
    const previousPath = extractAvatarPath(current?.avatar_url ?? null);

    const updated = await profileRepository.updateOwnProfile(
      params.actor.id,
      { avatar_url: null },
    );

    // Best-effort delete del blob anterior. Fault-tolerant: si
    // Storage falla, el perfil ya quedo con avatar_url=null y la UI
    // muestra iniciales correctamente. Usamos admin client porque
    // el RLS de Storage para 'avatars' permite INSERT (no DELETE)
    // al dueno; DELETE requiere bypass via service role.
    if (previousPath) {
      try {
        const supabase = createAdminClient();
        const { error } = await supabase.storage
          .from("avatars")
          .remove([previousPath]);
        if (error) {
          logger.warn("removeAvatar: storage delete fallo (no bloquea)", {
            userId: params.actor.id,
            path: previousPath,
            error: error.message,
          });
        }
      } catch (e) {
        logger.warn("removeAvatar: storage delete excepcion (no bloquea)", {
          userId: params.actor.id,
          path: previousPath,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return ok(updated);
  },

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<Result<void, AppError>> {
    if (!canChangeOwnPassword(params.actor)) {
      return err(authzCannotEdit());
    }

    // 1) Verificar current_password con un cliente NO persistente
    //    para no pisar la sesion cookie-based del user.
    const verifyClient = createVerifyClient();
    const { error: verifyError } =
      await verifyClient.auth.signInWithPassword({
        email: params.actor.email,
        password: params.currentPassword,
      });

    if (verifyError) {
      return err(
        new ValidationError(
          ErrorCodes.PROFILE_PASSWORD_INCORRECT,
          "Contraseña actual incorrecta.",
        ),
      );
    }

    // 2) Actualizar via cliente normal (la sesion del user sigue
    //    valida; auth.updateUser opera sobre auth.uid()).
    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: params.newPassword,
    });

    if (updateError) {
      // Bloque 22.6: reuse de la misma password → mensaje claro en
      // lugar de "No fue posible cambiar la contraseña" generico.
      if (isSamePasswordError(updateError)) {
        return err(
          new ValidationError(
            ErrorCodes.PROFILE_PASSWORD_SAME_AS_CURRENT,
            "No puedes usar tu contraseña actual. Elige una diferente.",
          ),
        );
      }
      logger.error("changePassword updateUser failed", {
        userId: params.actor.id,
        message: updateError.message,
      });
      return err(
        new AuthenticationError(
          ErrorCodes.AUTH_SESSION_EXPIRED,
          "No fue posible cambiar la contraseña. Intenta de nuevo.",
        ),
      );
    }

    // 3) Audit (regla 8): cambio de password es evento de seguridad.
    await auditRepository.record({
      event: "user.password_changed",
      resourceType: "user",
      resourceId: params.actor.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: { method: "self_service_profile" },
    });

    return ok(undefined);
  },
};

// Re-export del NotFoundError para que el caller no tenga que
// importarlo desde un path obscuro si necesita distinguir 404.
export { NotFoundError };
