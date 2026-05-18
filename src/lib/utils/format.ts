// Utilities de formato para presentacion. Reutilizables across modulos
// (UI, emails, PDF, etc.). Sin dependencias de domain types pesados.

interface UserLikeName {
  full_name: string | null;
  email: string;
}

// Display name del user para saludos y header. Fallback a la parte
// local del email si no tiene full_name (caso valido durante onboarding
// antes de completar perfil).
export function getDisplayName(user: UserLikeName): string {
  return user.full_name?.trim() || user.email.split("@")[0];
}

// Iniciales para avatar fallback. Convencion de apps profesionales
// (LinkedIn, Slack, GitHub): 1 palabra = 1 letra, 2+ palabras =
// primera de la primera + primera de la ultima (NO primera + segunda).
// Asi "Santiago Uribe Arroyave" -> "SA" y "Gildardo de Jesus Uribe Gil"
// -> "GG", sin necesidad de skip de particulas.
export function getInitials(
  name: string | null | undefined,
  email: string,
): string {
  const source = name?.trim() || email.split("@")[0];
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  const first = words[0].charAt(0);
  const last = words[words.length - 1].charAt(0);
  return (first + last).toUpperCase();
}
