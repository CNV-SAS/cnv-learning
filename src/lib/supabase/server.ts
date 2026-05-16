// Cliente Supabase para Server Components, Server Actions y Route Handlers.
// Lee tokens de cookies HTTP-only via next/headers. En Next.js 15 cookies()
// es async, por eso la factory es async también.
//
// Anon key + RLS protegen las queries. Cualquier acceso que requiera bypass
// de RLS (trigger, audit, verify público) debe usar admin.ts en su lugar.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.generated";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll llamado desde Server Component (no se puede mutar
            // cookies fuera de Server Action o Route Handler). Ignorable
            // porque el middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
