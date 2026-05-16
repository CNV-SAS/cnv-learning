// Middleware de Next.js, vive en Edge runtime por naturaleza del runtime de
// middleware (excepcion justificada al principio "Node.js todo" de
// ARCHITECTURE.md; aprobada en Bloque 2 sub-bloque 2.1, se documenta
// formalmente en ARCHITECTURE.md post-Bloque 2). Toda otra capa (server
// components, server actions, route handlers, services) vive en Node.js.
//
// Responsabilidades:
// 1. Refrescar tokens de sesion de Supabase en cada request (delega en
//    lib/supabase/middleware.ts).
// 2. Redirigir a /login si no hay sesion y la ruta es protegida (anexa
//    ?next=<pathname> para volver tras login).
// 3. Redirigir a /dashboard si hay sesion y el user esta en pagina de auth
//    (no mostrar login a quien ya entro).
//
// NO incluye logica de autorizacion por rol (vive en policies). NO incluye
// validacion de input (vive en server actions). NO incluye audit (idem).

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/privacy",
  "/terms",
  "/support",
] as const;

const AUTH_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
] as const;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // User sin sesion intentando entrar a ruta protegida -> /login
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // User autenticado en pagina de auth -> /dashboard
  if (user && isAuthPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all request paths except:
    // - _next/static (Next.js static files)
    // - _next/image (Next.js image optimization)
    // - favicon.ico
    // - api/webhooks (validan HMAC, no sesion)
    // - static assets por extension (.png, .jpg, .svg, etc.)
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
