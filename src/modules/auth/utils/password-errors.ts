// Detector del error "same_password" que Supabase Auth retorna cuando
// auth.updateUser({ password }) recibe un password identico al actual.
//
// Bloque 22.6: pre-22.6 el error caia generico en el catch-all y la
// UI mostraba "Sesion de reset expirada o invalida" o "No fue posible
// cambiar la contraseña", ambos confusos para el user que solo queria
// reusar su password.
//
// Supabase expone el error de dos formas dependiendo de version del
// SDK: AuthApiError con `code: "same_password"` (nuevo) y/o
// `message` conteniendo "should be different from the old password"
// (legacy). Detectamos ambos para que el fix sea resistente a
// upgrades del cliente.

interface MaybeAuthError {
  code?: string;
  message?: string;
}

export function isSamePasswordError(
  error: MaybeAuthError | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "same_password") return true;
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("should be different from the old password")) return true;
  return false;
}
