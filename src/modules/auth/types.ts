// Types base del modulo auth.
//
// Convencion:
// - Profile = row literal de la tabla public.profiles (snake_case).
// - AuthenticatedUser = subset que policies y server actions
//   consumen para autorizacion + UI compartida del layout (avatar
//   en header).
//
// Para acciones que necesiten mas data del profile (bio,
// professional_license, etc.), reciben Profile directo desde el
// repository.
//
// avatar_url agregado en Bloque 16 para que el header (Server
// Component) pueda renderizar la foto sin un fetch adicional.

import type { Database } from "@/types/database.generated";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthenticatedUser = Pick<
  Profile,
  "id" | "email" | "role" | "full_name" | "avatar_url"
>;
