// Validacion del input para updateAvatarAction.
//
// El componente cliente sube el archivo directamente a Supabase
// Storage (decision F del plan B16) y luego llama a esta action
// con la URL publica resultante. La action solo persiste la URL
// en profiles.avatar_url.
//
// URL formato: https://<project>.supabase.co/storage/v1/object/
// public/avatars/{user_id}/{uuid}.{ext}
//
// Valida que sea HTTPS + apuntando a un host de Supabase Storage.
// Para MVP no validamos el host exacto; solo HTTPS y URL bien
// formada. Si en v2 hay multiples proveedores de Storage, agregar
// allowlist.

import { z } from "zod";

export const updateAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .url("URL de avatar inválida")
    .startsWith("https://", "El avatar debe servirse por HTTPS")
    .max(2048, "URL demasiado larga"),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
