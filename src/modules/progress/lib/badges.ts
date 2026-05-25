// Catalogo de badges del MVP. Funcion pura: percentage -> Badge
// (rank). Bloque 22.2 extiende el catalogo con 2 achievements
// (Graduado CNV, Profesional Conectado CNV).
//
// Shape plenamente serializable (strings en todos los campos) para
// cruzar la frontera Server -> Client sin issues.
//
// kind distingue:
//   - rank: progresivos y mutuamente excluyentes pero acumulativos
//     visualmente (Junior queda activo cuando tienes Senior). Se
//     calculan al render con percentage del progreso.
//   - achievement: aditivos, no mutuamente excluyentes. Se
//     conceden por eventos discretos (constancia emitida,
//     corporativo emitido).
//
// description: texto largo para tooltip de conseguida.
// requirement: texto para tooltip de no conseguida.

export type BadgeId =
  | "junior"
  | "senior"
  | "master"
  | "graduated"
  | "professional_cnv";

export type BadgeIconName =
  | "sparkles"
  | "award"
  | "trophy"
  | "graduation-cap"
  | "pro-cnv";

export type BadgeKind = "rank" | "achievement";

export interface Badge {
  id: BadgeId;
  kind: BadgeKind;
  label: string;
  iconName: BadgeIconName;
  colorClass: string;
  description: string;
  requirement: string;
}

const BADGE_JUNIOR: Badge = {
  id: "junior",
  kind: "rank",
  label: "Junior Bioimpedancia",
  iconName: "sparkles",
  colorClass: "bg-muted text-muted-foreground",
  description: "Insignia inicial al inscribirte al diplomado.",
  requirement: "Solo necesitas inscribirte al curso.",
};

const BADGE_SENIOR: Badge = {
  id: "senior",
  kind: "rank",
  label: "Senior Medicina Bioeléctrica",
  iconName: "award",
  colorClass: "bg-emerald-100 text-emerald-700",
  description: "Has avanzado más del 50% del curso.",
  requirement: "Alcanza el 50% del curso.",
};

const BADGE_MASTER: Badge = {
  id: "master",
  kind: "rank",
  label: "Master ATLAS",
  iconName: "trophy",
  colorClass: "bg-amber-100 text-amber-700",
  description: "Estás cerca de completar el diplomado.",
  requirement: "Alcanza el 85% del curso.",
};

const BADGE_GRADUATED: Badge = {
  id: "graduated",
  kind: "achievement",
  label: "Graduado CNV",
  iconName: "graduation-cap",
  colorClass: "bg-emerald-200 text-emerald-800",
  description:
    "Completaste el curso al 100% y se emitió tu Constancia de Finalización.",
  requirement: "Completa el curso al 100%.",
};

const BADGE_PROFESSIONAL_CNV: Badge = {
  id: "professional_cnv",
  kind: "achievement",
  label: "Profesional Conectado CNV",
  iconName: "pro-cnv",
  // Color provisional; el SVG custom del 22.5 maneja su propio styling
  // (escudo dorado #C9A84C con borde emerald-700).
  colorClass: "bg-amber-50 text-amber-900 border-emerald-700",
  description:
    "Certificado corporativo CNV: reconocimiento como Profesional Conectado de la red CNV.",
  requirement: "Se otorga manualmente por administración.",
};

// Lista completa ordenada: ranks primero (Junior -> Master), luego
// achievements (Graduado -> Profesional CNV). InsigniasCard itera
// en este orden.
export const ALL_BADGES: readonly Badge[] = [
  BADGE_JUNIOR,
  BADGE_SENIOR,
  BADGE_MASTER,
  BADGE_GRADUATED,
  BADGE_PROFESSIONAL_CNV,
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
