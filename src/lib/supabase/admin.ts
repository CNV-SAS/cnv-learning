// Cliente Supabase con SERVICE_ROLE_KEY: BYPASSA COMPLETAMENTE RLS.
// Es la llave maestra del proyecto.
//
// REGLAS CRÍTICAS (SECURITY.md líneas 92-111):
// 1. NUNCA se expone al cliente (ningún import desde Client Components).
// 2. NUNCA se importa fuera de este archivo. Otro código importa client.ts
//    o server.ts; solo casos justificados llaman aquí.
// 3. CADA uso debe documentar en comentario por qué se necesita bypass.
//
// Casos legítimos para usar service role (los únicos):
// - Trigger automático de creación de profile al crear user (SQL trigger,
//   no llama este archivo directamente; está en migración 0002).
// - Verificación pública de certificado en /verify/<id> (la página NO
//   requiere login, no hay auth.uid() para RLS).
// - Audit logging desde rutas donde el user no está autenticado todavía
//   (ej. intento de login fallido).
// - Tareas administrativas masivas iniciadas por admin (inscripción de
//   cohorte completo, seed, etc.).
//
// Casos NO legítimos (usar server.ts o client.ts):
// - Leer datos del usuario actual.
// - Cualquier operación donde RLS aplica naturalmente.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no esta configurada en el environment",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
