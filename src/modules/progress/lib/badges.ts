// Catalogo de badges de progreso (MVP.md Bloque 5). Funcion pura:
// percentage -> Badge. Sin estado persistido en BD; la insignia se
// calcula al render desde lesson_progress.
//
// Shape plenamente serializable (strings en todos los campos) para
// cruzar la frontera Server -> Client sin issues (mismo aprendizaje
// del sub-bloque 3.5-fix). El colorClass vive aqui para centralizar
// la decision visual y evitar branching en el componente.

export type BadgeId = "junior" | "senior" | "master";
export type BadgeIconName = "sparkles" | "award" | "trophy";

export interface Badge {
  id: BadgeId;
  label: string;
  iconName: BadgeIconName;
  colorClass: string;
}

const BADGE_JUNIOR: Badge = {
  id: "junior",
  label: "Junior Bioimpedancia",
  iconName: "sparkles",
  colorClass: "bg-muted text-muted-foreground",
};

const BADGE_SENIOR: Badge = {
  id: "senior",
  label: "Senior Medicina Bioeléctrica",
  iconName: "award",
  colorClass: "bg-emerald-100 text-emerald-700",
};

const BADGE_MASTER: Badge = {
  id: "master",
  label: "Master ATLAS",
  iconName: "trophy",
  colorClass: "bg-amber-100 text-amber-700",
};

// Lista completa para renderizar la tarjeta de insignias del
// dashboard student (Bloque 21.6 B2). El componente muestra las 3
// en orden ascendente, coloreando solo la actual.
export const ALL_BADGES: readonly Badge[] = [
  BADGE_JUNIOR,
  BADGE_SENIOR,
  BADGE_MASTER,
];

// Rangos (ajustados en Bloque 5 sub-bloque 5.3-badges post smoke).
// Los umbrales originales de MVP.md (Junior 0-59 / Senior 60-99 /
// Master 100) resultaron desmotivadores: 28/30 lecciones (93%)
// quedaba en Senior. Ajuste a:
//   0-49   -> Junior Bioimpedancia
//   50-84  -> Senior Medicina Bioeléctrica
//   85-100 -> Master ATLAS
//
// Master no exige 100% para motivar el cierre de curso sin penalizar
// las ultimas 1-2 lecciones (que pueden ser revision o bonus).
export function getBadge(percentage: number): Badge {
  if (percentage >= 85) return BADGE_MASTER;
  if (percentage >= 50) return BADGE_SENIOR;
  return BADGE_JUNIOR;
}
