// Types base del modulo auth.
//
// Convencion:
// - Profile = row literal de la tabla public.profiles (snake_case).
// - AuthenticatedUser = subset minimo que policies y server actions
//   consumen para decisiones de autorizacion. Pick explicito para
//   evitar acoplar la capa de auth al row completo.
//
// Para acciones que necesiten mas data del profile (avatar_url, bio,
// professional_license, etc.), reciben Profile directo desde el
// repository (modules/auth/data/profile.repository.ts en sub-bloque 2.7).

import type { Database } from "@/types/database.generated";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthenticatedUser = Pick<
  Profile,
  "id" | "email" | "role" | "full_name"
>;
