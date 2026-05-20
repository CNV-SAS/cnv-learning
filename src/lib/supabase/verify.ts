// Cliente Supabase NO PERSISTENTE para verificacion one-shot.
//
// Caso de uso unico (Bloque 16, consideracion A1 del plan):
// changePassword necesita verificar la contrasena actual del user
// antes de aceptar la nueva. La forma estandar es
// supabase.auth.signInWithPassword({email, currentPassword}); el
// problema es que esto crea una nueva sesion que pisa la del user
// si se usa el client normal con cookies.
//
// Solucion: cliente transitorio con persistSession=false +
// autoRefreshToken=false. La "sesion" generada por el login de
// verificacion vive solo en memoria del request y se descarta al
// terminar. La sesion cookie-based del user en el browser queda
// intacta.
//
// Usa anon key (no service role) porque signInWithPassword es
// flow publico, no requiere bypass de RLS.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

export function createVerifyClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
