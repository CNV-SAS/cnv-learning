// Types base del modulo forum. Reuso de los Row generados por
// Supabase CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type Forum = Database["public"]["Tables"]["forums"]["Row"];
export type ForumThread =
  Database["public"]["Tables"]["forum_threads"]["Row"];
export type ForumReply =
  Database["public"]["Tables"]["forum_replies"]["Row"];

// Subset del Profile que UI de foros consume (autor en cada thread/reply).
// Pick explicito para no acoplar el render del foro al row completo
// del profile (que tiene bio, professional_license, etc. irrelevantes).
export interface ForumAuthor {
  id: string;
  full_name: string;
  role: Database["public"]["Enums"]["user_role"];
}

// author es nullable: el embedded join via PostgREST retorna null
// cuando la RLS de profiles bloquea el cross-read (ej. student
// leyendo el profile de otro student del mismo curso, sin policy
// de course-peer). Una migracion posterior cierra ese gap; mientras
// tanto la UI cae a un fallback "(Sin perfil)" en lugar de crashear.
export interface ThreadWithAuthor extends ForumThread {
  author: ForumAuthor | null;
}

export interface ReplyWithAuthor extends ForumReply {
  author: ForumAuthor | null;
}

// Conteos derivados para ForumListPage. Calculados via aggregate
// query en el repo; no son columnas en la tabla.
export interface ForumWithStats extends Forum {
  thread_count: number;
  last_activity_at: string | null;
}
