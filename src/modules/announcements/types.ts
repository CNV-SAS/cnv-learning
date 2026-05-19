// Types base del modulo announcements. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).
//
// scope check enforced en BD ('course' | 'global'); aqui exponemos
// el union literal para discriminacion en service y policies.

import type { Database } from "@/types/database.generated";

export type Announcement =
  Database["public"]["Tables"]["announcements"]["Row"];

export type AnnouncementScope = "course" | "global";

// Subset minimo de profile que recipient repo retorna para que
// service consuma sin fetch adicional. id para notifications +
// email + full_name para personalizar el subject/body.
export interface AnnouncementRecipient {
  userId: string;
  email: string;
  fullName: string;
}
