// Auth service: orquesta llamadas a Supabase Auth + rate limit + audit
// + logging. Retorna Result<T, AppError> en lugar de throw (convencion
// ARCHITECTURE.md 510-515).
//
// Las server actions del modulo auth (sub-bloque 2.10) consumen este
// servicio; toda la logica de negocio vive aqui, NO en las actions.

import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { AppError, AuthenticationError } from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";
import { logAuditEvent } from "@/core/audit/log";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import type { AuthenticatedUser } from "@/modules/auth/types";

function rateLimitError(secondsLeft: number, kind: "login" | "reset"): AppError {
  const action = kind === "login" ? "intentos" : "solicitudes";
  return new AppError(
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    `Demasiados ${action}. Vuelve a intentar en ${secondsLeft} segundos.`,
    429,
  );
}

export const authService = {
  async login(input: {
    email: string;
    password: string;
    ip: string;
    userAgent: string;
  }): Promise<Result<AuthenticatedUser, AppError>> {
    // Rate limit por IP: 5 intentos / 15 min (lib/ratelimit/index.ts).
    const limit = await ratelimit.login.limit(input.ip);
    if (!limit.success) {
      const secondsLeft = Math.ceil((limit.reset - Date.now()) / 1000);
      return err(rateLimitError(secondsLeft, "login"));
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      // NO logueamos password ni distinguimos "user no existe" vs
      // "password incorrecto" en el mensaje al caller (anti enumeration).
      logger.info("Login failed", { email: input.email, ip: input.ip });
      return err(
        new AuthenticationError(
          ErrorCodes.AUTH_INVALID_CREDENTIALS,
          "Email o contraseña incorrectos.",
        ),
      );
    }

    // Resolver profile via repositorio (regla dura 1: no select inline).
    const user = await profileRepository.getCurrentUser();
    if (!user) {
      logger.error("Login succeeded but profile not found", {
        userId: data.user.id,
      });
      return err(
        new AuthenticationError(
          ErrorCodes.AUTH_INVALID_CREDENTIALS,
          "Usuario sin perfil. Contacta a soporte.",
        ),
      );
    }

    // Audit solo si admin (decision Bloque 2 aprobada por Santiago;
    // SECURITY.md 141 lista admin.login con IP + user agent).
    if (user.role === "admin") {
      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        event: "admin.login",
        ipAddress: input.ip,
        userAgent: input.userAgent,
      });
    }

    logger.info("Login success", { userId: user.id, role: user.role });
    return ok(user);
  },

  async logout(): Promise<Result<void, AppError>> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("Logout failed", { message: error.message });
      return err(
        new AuthenticationError(
          ErrorCodes.AUTH_SESSION_EXPIRED,
          "No fue posible cerrar sesión.",
        ),
      );
    }
    return ok(undefined);
  },

  async requestPasswordReset(input: {
    email: string;
    ip: string;
    redirectTo: string;
  }): Promise<Result<void, AppError>> {
    // Rate limit por IP: 3 solicitudes / 1 h.
    const limit = await ratelimit.forgotPassword.limit(input.ip);
    if (!limit.success) {
      const secondsLeft = Math.ceil((limit.reset - Date.now()) / 1000);
      return err(rateLimitError(secondsLeft, "reset"));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: input.redirectTo,
    });

    // Anti email enumeration: SIEMPRE retornamos ok aunque el email no
    // exista o la API falle. Solo logueamos internamente para diagnostico.
    if (error) {
      logger.warn("Password reset request error (suppressed for caller)", {
        email: input.email,
        message: error.message,
      });
    }

    return ok(undefined);
  },

  async resetPassword(newPassword: string): Promise<Result<void, AppError>> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      logger.error("Password reset failed", { message: error.message });
      return err(
        new AuthenticationError(
          ErrorCodes.AUTH_SESSION_EXPIRED,
          "Sesión de reset expirada o inválida. Solicita un nuevo link.",
        ),
      );
    }

    // Cerrar la sesion temporal de recovery. El user debe re-loguear
    // con la nueva password. Defensa: previene que un actor con acceso
    // al inbox quede con sesion activa indefinidamente sin saber la pw.
    // No bloqueante: si signOut falla, la password ya se actualizo OK.
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      logger.warn("signOut after password reset failed (non-blocking)", {
        message: signOutError.message,
      });
    }

    return ok(undefined);
  },
};
