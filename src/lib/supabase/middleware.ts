// Cliente Supabase para src/middleware.ts (Edge runtime).
// Refresca tokens de sesión en cada request y retorna el user actual.
// Es la ÚNICA pieza del proyecto que vive en Edge runtime (excepción
// justificada al principio "Node.js todo" de ARCHITECTURE.md; el
// middleware de Next.js corre en Edge por naturaleza, y el patrón
// estándar de @supabase/ssr asume Edge).
//
// El caller (src/middleware.ts) usa { supabaseResponse, user } para
// decidir redirecciones (sin sesión + ruta protegida -> /login).
// Toda lógica de autorización por rol vive en policies (no aquí).

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.generated";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANTE (docs oficiales de Supabase): no ejecutar codigo entre
  // createServerClient y supabase.auth.getUser(). Un error sutil puede
  // hacer que usuarios queden randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
