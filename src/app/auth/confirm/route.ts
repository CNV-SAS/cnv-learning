// Route handler para verificacion de tokens OTP de email.
//
// CUANDO USAR /auth/confirm (este endpoint):
// - Signup confirmation (al confirmar el email tras registro).
// - Password recovery (link del email "olvide mi contrasena").
// - Magic link login (post-MVP).
// - Email change confirmation (post-MVP, al cambiar email del perfil).
// En general, cualquier flow donde Supabase envia un email con link
// que contiene ?token_hash=xxx&type=<recovery|signup|email_change|
// magiclink|invite>. La funcion correcta es supabase.auth.verifyOtp.
//
// CUANDO CREAR /auth/callback (no existe en MVP, post-MVP solo si se
// agrega OAuth):
// - Login con Google, GitHub, GitLab, etc.
// - En esos flujos el query es ?code=<pkce_code> y la funcion correcta
//   es supabase.auth.exchangeCodeForSession.
//
// NOTA CRITICA: el email template de Supabase Dashboard debe usar
// {{ .TokenHash }} y {{ .Type }} explicitamente, NO {{ .ConfirmationURL }}.
// La URL default genera PKCE flow (?token=pkce_xxx) que requiere
// code_verifier presente en cookies del browser. Si el browser que
// hace forgot-password es distinto del que clickea el link del email,
// el verifier no esta y verifyOtp falla con bad_code_verifier.
//
// /auth/confirm esta en PUBLIC_PATHS del middleware (no requiere sesion
// activa al entrar; la sesion se crea aqui mismo via verifyOtp).
//
// Patron oficial documentado:
// https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/core/logger/logger";
import { logAuditEvent } from "@/core/audit/log";
import { withContext } from "@/core/logger/context";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const { searchParams, origin } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = searchParams.get("next") ?? "/dashboard";

    // Anti open-redirect (mismo guard que loginAction): next debe ser
    // ruta interna que empieza con "/" y NO con "//" (protocol-relative).
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    if (!token_hash || !type) {
      // Llamada sin parametros validos. Defensivo: link mal formado,
      // scraper, etc.
      logger.warn("Auth confirm called without token_hash or type");
      return NextResponse.redirect(`${origin}/login`);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (error) {
      // Error esperado del flow defensivo: token expirado, token ya
      // consumido (link clickeado dos veces), code_verifier missing
      // por browser cross-window, etc. Sesion NO se crea cuando
      // verifyOtp falla (confirmado en investigacion 2.20-diag).
      //
      // logger.warn (no error) porque es UX-defensive controlado:
      // el user recibe toast claro en /login y puede reintentar.
      // NO ensucia Sentry con falsos positivos. logger.error queda
      // reservado para fallas inesperadas reales (DB down, etc.).
      logger.warn("Auth confirm verifyOtp failed", {
        type,
        message: error.message,
      });

      // Audit del fallo (potencial token reuse, token falso, intento
      // malicioso). No bloqueante (logAuditEvent es failure-soft).
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const userAgent = request.headers.get("user-agent") ?? "unknown";
      await logAuditEvent({
        actorId: null,
        actorEmail: null,
        event: "auth.confirm_failed",
        ipAddress: ip,
        userAgent,
        metadata: { type, reason: error.message },
      });

      return NextResponse.redirect(
        `${origin}/login?error=auth_confirm_failed`,
      );
    }

    logger.info("Auth confirm verifyOtp success", { type, next: safeNext });
    return NextResponse.redirect(`${origin}${safeNext}`);
  });
}
