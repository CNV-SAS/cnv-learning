// Service: admin user management. ARCHITECTURE.md regla 2 (action
// thin -> service). Toda la logica de gestion de usuarios vive aqui:
// policy checks, audit, side effects (email, ban, hard delete).
//
// 6 operaciones:
//   1. createUser: auth.admin.createUser + setProfileFields defensivo
//      + sendUserInvitationEmail (recovery link). Trigger
//      handle_new_user (migracion 0002) crea el profile.
//   2. updateRole: anti-self + anti-lockout (isLastAdmin) + update
//      profile.role.
//   3. suspendUser: anti-self + anti-lockout + ban via auth.admin.
//   4. unsuspendUser: solo canManageUsers (sin guards adicionales:
//      desbloquear es siempre seguro).
//   5. sendPasswordReset: solo canManageUsers + generateLink
//      (type='recovery') + sendUserPasswordResetEmail.
//   6. deleteUser: anti-self + anti-lockout + validar confirmEmail
//      vs profile.email + auth.admin.deleteUser (cascade limpia
//      profile + entities; campos actor preservados con SET NULL
//      via migracion 0024).
//
// Audit (ARCHITECTURE.md regla 8) en cada operacion exitosa.
// Eventos: user.created, user.role_changed, user.suspended,
// user.unsuspended, user.password_reset_forced, user.deleted.

import { adminUserRepository } from "@/modules/admin/data";
import {
  canManageUsers,
  canChangeRole,
  canSuspendUser,
  canDeleteUser,
} from "@/modules/admin/policies";
import { auditRepository } from "@/modules/audit/data";
import {
  sendUserInvitationEmail,
  sendUserPasswordResetEmail,
} from "@/lib/email";
import { logger } from "@/core/logger/logger";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser, Profile, UserRole } from "@/modules/auth/types";

interface CreateUserParams {
  actor: AuthenticatedUser;
  email: string;
  fullName: string;
  role: UserRole;
}

interface UpdateRoleParams {
  actor: AuthenticatedUser;
  targetUserId: string;
  newRole: UserRole;
}

interface UpdateNameParams {
  actor: AuthenticatedUser;
  targetUserId: string;
  newFullName: string;
}

interface SuspendUserParams {
  actor: AuthenticatedUser;
  targetUserId: string;
  reason: string;
}

interface UnsuspendUserParams {
  actor: AuthenticatedUser;
  targetUserId: string;
}

interface SendPasswordResetParams {
  actor: AuthenticatedUser;
  targetUserId: string;
}

interface DeleteUserParams {
  actor: AuthenticatedUser;
  targetUserId: string;
  confirmEmail: string;
}

function authzError(
  code: string,
  message: string,
): AuthorizationError {
  return new AuthorizationError(code, message);
}

function notFoundUser(): NotFoundError {
  return new NotFoundError(
    ErrorCodes.USER_NOT_FOUND,
    "Usuario no encontrado.",
  );
}

// Resuelve si el target es admin Y es el unico admin del sistema.
// Usado por updateRole, suspendUser, deleteUser para el anti-lockout.
async function resolveIsLastAdmin(target: Profile): Promise<boolean> {
  if (target.role !== "admin") return false;
  const count = await adminUserRepository.countAdmins();
  return count === 1;
}

export const adminUserService = {
  async createUser(
    params: CreateUserParams,
  ): Promise<Result<{ userId: string }, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede crear usuarios.",
        ),
      );
    }

    // Pre-check: email ya existe en profiles. Devuelve error claro
    // antes de intentar createAuthUser que tirara error generico.
    const existing = await adminUserRepository.findProfileByEmail(params.email);
    if (existing) {
      return err(
        new DomainError(
          ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
          "Ya existe un usuario con ese email.",
        ),
      );
    }

    const { userId } = await adminUserRepository.createAuthUser({
      email: params.email,
      fullName: params.fullName,
      role: params.role,
    });

    // Defensa: forzar full_name + role en el profile creado por el
    // trigger. Idempotente si el trigger ya seteo bien (raw_user_meta_data).
    await adminUserRepository.setProfileFields(userId, {
      full_name: params.fullName,
      role: params.role,
    });

    // Recovery link para que el user setee password por primera vez.
    // Si generateLink falla, el user queda creado pero sin link de
    // acceso; el admin puede re-disparar via sendPasswordReset. NO
    // hacemos rollback (createUser es la accion semantica completa).
    let inviteUrl: string | null = null;
    try {
      inviteUrl = await adminUserRepository.generateRecoveryLink({
        email: params.email,
      });
    } catch (e) {
      logger.error("createUser: generateRecoveryLink failed", {
        userId,
        email: params.email,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    if (inviteUrl) {
      // Fault-tolerant: sendEmail no throw. Si Resend cae, el admin
      // puede re-disparar via sendPasswordReset.
      await sendUserInvitationEmail({
        recipientEmail: params.email,
        recipientName: params.fullName,
        role: params.role,
        inviteUrl,
      });
    }

    await auditRepository.record({
      event: "user.created",
      resourceType: "user",
      resourceId: userId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: params.email,
        targetFullName: params.fullName,
        targetRole: params.role,
        inviteSent: inviteUrl !== null,
      },
    });

    return ok({ userId });
  },

  async updateRole(
    params: UpdateRoleParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede cambiar roles.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    if (target.id === params.actor.id) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_CHANGE_OWN_ROLE,
          "No puedes cambiar tu propio rol. Otro administrador debe hacerlo.",
        ),
      );
    }

    const isLastAdmin = await resolveIsLastAdmin(target);
    const allowed = canChangeRole(params.actor, {
      targetUserId: params.targetUserId,
      newRole: params.newRole,
      isLastAdmin,
    });
    if (!allowed) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_TARGET_LAST_ADMIN,
          "No puedes degradar al último administrador del sistema.",
        ),
      );
    }

    const previousRole = target.role;
    if (previousRole === params.newRole) {
      // Idempotencia: no-op si el rol ya esta seteado. NO auditamos.
      return ok(undefined);
    }

    await adminUserRepository.updateProfileRole(
      params.targetUserId,
      params.newRole,
    );

    await auditRepository.record({
      event: "user.role_changed",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetFullName: target.full_name,
        previousRole,
        newRole: params.newRole,
      },
    });

    return ok(undefined);
  },

  // Bloque 22.15: admin actualiza el nombre completo de un user.
  //
  // Caveat de certificates (documentado en el header del schema
  // update-profile.ts): el hash del Profesional Conectado CNV se
  // calcula con user_id + timestamp + template_version (no incluye
  // full_name). Cambiar el nombre tras emitir el cert:
  //   - NO invalida el hash (hash se mantiene verificable).
  //   - SI cambia lo que ve el verificador en el PDF y en la pagina
  //     publica /verify-corporate/[id] (ambos leen full_name actual).
  // Por eso esta operacion es admin-only: el admin asume la
  // responsabilidad institucional de cualquier cambio post-emision
  // y queda registrado en audit_logs como user.name_updated con
  // {previousName, newName}.
  async updateName(
    params: UpdateNameParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede modificar el nombre.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    const previousName = target.full_name;
    if (previousName === params.newFullName) {
      // Idempotencia: no-op si el nombre ya esta seteado. NO auditamos.
      return ok(undefined);
    }

    await adminUserRepository.updateProfileName(
      params.targetUserId,
      params.newFullName,
    );

    await auditRepository.record({
      event: "user.name_updated",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetRole: target.role,
        previousName,
        newName: params.newFullName,
      },
    });

    return ok(undefined);
  },

  async suspendUser(
    params: SuspendUserParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede suspender usuarios.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    if (target.id === params.actor.id) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_TARGET_SELF,
          "No puedes suspenderte a ti mismo.",
        ),
      );
    }

    const isLastAdmin = await resolveIsLastAdmin(target);
    const allowed = canSuspendUser(params.actor, {
      targetUserId: params.targetUserId,
      isLastAdmin,
    });
    if (!allowed) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_TARGET_LAST_ADMIN,
          "No puedes suspender al último administrador del sistema.",
        ),
      );
    }

    await adminUserRepository.banAuthUser(params.targetUserId);

    await auditRepository.record({
      event: "user.suspended",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetFullName: target.full_name,
        targetRole: target.role,
        reason: params.reason,
      },
    });

    return ok(undefined);
  },

  async unsuspendUser(
    params: UnsuspendUserParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede levantar suspensiones.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    await adminUserRepository.unbanAuthUser(params.targetUserId);

    await auditRepository.record({
      event: "user.unsuspended",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetFullName: target.full_name,
        targetRole: target.role,
      },
    });

    return ok(undefined);
  },

  async sendPasswordReset(
    params: SendPasswordResetParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede forzar resets de contraseña.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    const resetUrl = await adminUserRepository.generateRecoveryLink({
      email: target.email,
    });

    await sendUserPasswordResetEmail({
      recipientEmail: target.email,
      recipientName: target.full_name,
      resetUrl,
    });

    await auditRepository.record({
      event: "user.password_reset_forced",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetFullName: target.full_name,
        targetRole: target.role,
      },
    });

    return ok(undefined);
  },

  async deleteUser(
    params: DeleteUserParams,
  ): Promise<Result<void, AppError>> {
    if (!canManageUsers(params.actor)) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_MANAGE_USERS,
          "Solo un administrador puede eliminar usuarios.",
        ),
      );
    }

    const target = await adminUserRepository.findProfileById(
      params.targetUserId,
    );
    if (!target) return err(notFoundUser());

    if (target.id === params.actor.id) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_TARGET_SELF,
          "No puedes eliminarte a ti mismo.",
        ),
      );
    }

    // confirmEmail viene normalizado (toLowerCase + trim) por la
    // validacion Zod del action. target.email lo bajamos a lower
    // para comparar; el DB lo guarda como vino (en MVP, todos los
    // emails se crean lowercase).
    if (params.confirmEmail !== target.email.toLowerCase()) {
      return err(
        new DomainError(
          ErrorCodes.USER_DELETE_CONFIRMATION_MISMATCH,
          "El email de confirmación no coincide con el del usuario.",
        ),
      );
    }

    const isLastAdmin = await resolveIsLastAdmin(target);
    const allowed = canDeleteUser(params.actor, {
      targetUserId: params.targetUserId,
      isLastAdmin,
    });
    if (!allowed) {
      return err(
        authzError(
          ErrorCodes.AUTHZ_CANNOT_TARGET_LAST_ADMIN,
          "No puedes eliminar al último administrador del sistema.",
        ),
      );
    }

    // Audit ANTES del delete porque el FK actor_id en audit_logs
    // se preserva con SET NULL (migracion 0024) PERO la metadata
    // del propio evento ya contiene el snapshot (email, role, name)
    // necesario para reconstruir quien era el target.
    await auditRepository.record({
      event: "user.deleted",
      resourceType: "user",
      resourceId: params.targetUserId,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        targetEmail: target.email,
        targetFullName: target.full_name,
        targetRole: target.role,
      },
    });

    await adminUserRepository.deleteAuthUser(params.targetUserId);

    return ok(undefined);
  },
};
