"use client";

// Cliente Supabase para Client Components (browser).
// Lee tokens de cookies HTTP-only gestionadas por @supabase/ssr.
// Anon key + RLS protegen las queries; ningún privilegio elevado.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.generated";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
