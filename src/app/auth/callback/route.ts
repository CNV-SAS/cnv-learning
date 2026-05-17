// Route handler de callback de Supabase Auth para flujo PKCE.
//
// @supabase/ssr v0.x usa PKCE flow por default: los email links contienen
// ?code=<pkce_code> en query params (NO tokens en hash fragment). Para
// crear la sesion hay que llamar explicitamente exchangeCodeForSession,
// lo cual hacemos aqui. Despues redirigimos al destino final (?next=...)
// con la sesion ya activa.
//
// Un unico endpoint cubre TODOS los auth callbacks futuros: password
// recovery (Bloque 2), email confirmation, OAuth (post-MVP), magic link
// (post-MVP). Si en algun caso el flujo cambia, este handler se ajusta
// en un solo lugar.
//
// /auth/callback esta en PUBLIC_PATHS del middleware (no requiere sesion
// activa al entrar; la sesion se crea aqui mismo).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/core/logger/logger";
import { logAuditEvent } from "@/core/audit/log";
import { withContext } from "@/core/logger/context";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  return withContext({ requestId }, async () => {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    // Anti open-redirect (mismo guard que loginAction): next debe ser
    // ruta interna que empieza con "/" y NO con "//" (protocol-relative).
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    if (!code) {
      // Llamada sin code. Defensivo: link mal formado, scraper, etc.
      logger.warn("Auth callback called without code");
      return NextResponse.redirect(`${origin}/login`);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("Auth callback exchange failed", {
        message: error.message,
      });

      // Audit del fallo (potencial code reuse, code falso, intento
      // malicioso). No bloqueante (logAuditEvent es failure-soft).
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const userAgent = request.headers.get("user-agent") ?? "unknown";
      await logAuditEvent({
        actorId: null,
        actorEmail: null,
        event: "auth.callback_failed",
        ipAddress: ip,
        userAgent,
        metadata: { reason: error.message },
      });

      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed`,
      );
    }

    logger.info("Auth callback exchange success", { next: safeNext });
    return NextResponse.redirect(`${origin}${safeNext}`);
  });
}
