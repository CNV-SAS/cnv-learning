// Catalogo de badges del MVP. Funcion pura: percentage -> Badge
// (rank). Bloque 22.2 extiende el catalogo con 2 achievements
// (Graduado CNV, Profesional Conectado CNV). Bloque 22.14 agrega
// 2 mas (Explorador CNV, Maestro CNV) por count de cursos
// completados (>= 5 y >= 10 respectivamente).
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
//     corporativo emitido, threshold de cursos completados).
//
// showInDashboard distingue:
//   - true: aparece en el InsigniasCard compacto del dashboard.
//     Para el MVP con 1 curso por student son: Junior, Senior,
//     Master, Graduado CNV y Profesional Conectado CNV.
//   - false: solo aparece en el ExpandedBadgesCard de /certificates.
//     Para Explorador CNV (5 cursos) y Maestro CNV (10 cursos),
//     que son insignias de largo plazo y no aplican al cohorte
//     actual con 1 curso.

export type BadgeId =
  | "junior"
  | "senior"
  | "master"
  | "graduated"
  | "professional_cnv"
  | "explorer_cnv"
  | "master_cnv";

export type BadgeIconName =
  | "sparkles"
  | "award"
  | "trophy"
  | "graduation-cap"
  | "pro-cnv"
  | "compass"
  | "crown";

export type BadgeKind = "rank" | "achievement";

export interface Badge {
  id: BadgeId;
  kind: BadgeKind;
  label: string;
  iconName: BadgeIconName;
  colorClass: string;
  description: string;
  requirement: string;
  showInDashboard: boolean;
}

// Bloque 22.7 fix Bug F + 22.8 + 22.11 rotacion final de paleta para
// que cada insignia sea visualmente distinta:
//   - Junior   = yellow-100/yellow-700 (amarillo claro, "inicio") 22.11
//   - Senior   = sky-100/sky-700 (azul claro, hereda diseño de
//                Junior pre-22.11) - 22.11
//   - Master   = amber-100/amber-700 (dorado, rango maximo)
//   - Graduado = emerald-200/emerald-800 (verde, achievement curso)
//   - Pro CNV  = blue-100/blue-700 + border-blue-700 (azul medio
//                heredado de Senior pre-22.11, manteniendo el border
//                oscuro distintivo del "glow") - 22.11
// La rotacion del 22.11 asigna amarillo a Junior, sube a Senior al
// sky-claro de Junior anterior, y mueve los azules del Pro CNV al
// tono medio de Senior anterior (manteniendo el border-blue-700 que
// distingue al Pro como el "glow").
const BADGE_JUNIOR: Badge = {
  id: "junior",
  kind: "rank",
  label: "Junior Bioimpedancia",
  iconName: "sparkles",
  colorClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
  description: "Insignia inicial al inscribirte al diplomado.",
  requirement: "Solo necesitas inscribirte al curso.",
  showInDashboard: true,
};

const BADGE_SENIOR: Badge = {
  id: "senior",
  kind: "rank",
  label: "Senior Medicina Bioeléctrica",
  iconName: "award",
  colorClass: "bg-sky-100 text-sky-700 border-sky-200",
  description: "Has avanzado más del 50% del curso.",
  requirement: "Alcanza el 50% del curso.",
  showInDashboard: true,
};

const BADGE_MASTER: Badge = {
  id: "master",
  kind: "rank",
  label: "Master ATLAS",
  iconName: "trophy",
  colorClass: "bg-amber-100 text-amber-700 border-amber-300",
  description: "Estás cerca de completar el diplomado.",
  requirement: "Alcanza el 85% del curso.",
  showInDashboard: true,
};

const BADGE_GRADUATED: Badge = {
  id: "graduated",
  kind: "achievement",
  label: "Graduado CNV",
  iconName: "graduation-cap",
  colorClass: "bg-emerald-200 text-emerald-800 border-emerald-400",
  description:
    "Completaste el curso al 100% y se emitió tu Constancia de Finalización.",
  requirement: "Completa el curso al 100%.",
  showInDashboard: true,
};

const BADGE_PROFESSIONAL_CNV: Badge = {
  id: "professional_cnv",
  kind: "achievement",
  label: "Profesional Conectado CNV",
  iconName: "pro-cnv",
  // 22.11: hereda el azul medio que tenia Senior pre-22.11 (bg-blue-
  // 100/text-blue-700) pero mantiene el border-blue-700 oscuro que
  // funciona como "glow" distintivo entre las insignias. Icono Network
  // (red de profesionales) se queda igual desde 22.7.
  colorClass: "bg-blue-100 text-blue-700 border-blue-700",
  description:
    "Certificado corporativo CNV: reconocimiento como Profesional Conectado de la red CNV.",
  // 23 smoke fix AJUSTE 5: copy mas claro sobre el camino para
  // obtenerla. El anterior "Se otorga manualmente por administracion"
  // sonaba opaco y arbitrario.
  requirement:
    "Se otorga una vez que cumples los requisitos profesionales y operativos para integrarte al ecosistema CNV.",
  showInDashboard: true,
};

// Bloque 22.14: insignias por count de cursos completados. Solo
// visibles en /certificates (no dashboard) porque el cohorte MVP
// tiene 1 curso. Trigger: count de certificates.status='valid'
// del user >= threshold.
const BADGE_EXPLORER_CNV: Badge = {
  id: "explorer_cnv",
  kind: "achievement",
  label: "Explorador CNV",
  iconName: "compass",
  colorClass: "bg-violet-100 text-violet-700 border-violet-300",
  description: "Has completado 5 cursos del catálogo CNV.",
  requirement: "Completa 5 cursos para conseguirla.",
  showInDashboard: false,
};

const BADGE_MASTER_CNV: Badge = {
  id: "master_cnv",
  kind: "achievement",
  label: "Maestro CNV",
  iconName: "crown",
  colorClass: "bg-rose-100 text-rose-700 border-rose-300",
  description: "Has completado 10 cursos del catálogo CNV.",
  requirement: "Completa 10 cursos para conseguirla.",
  showInDashboard: false,
};

// Lista completa ordenada: ranks primero (Junior -> Master), luego
// achievements (Graduado -> Explorador -> Maestro CNV -> Pro CNV).
// El orden de achievements va de menor a mayor escalabilidad
// (1 curso -> 5 -> 10 -> requisitos operativos institucionales).
// Reordenado en Bloque 23 smoke fix AJUSTE 6 para que Pro CNV
// quede al final como el reconocimiento maximo.
//
// El orden importa: InsigniasCard del dashboard filtra a
// showInDashboard=true y los renderiza en este orden; ExpandedBadgesCard
// de /certificates muestra los 7 en 2 grupos (ranks vs achievements).
export const ALL_BADGES: readonly Badge[] = [
  BADGE_JUNIOR,
  BADGE_SENIOR,
  BADGE_MASTER,
  BADGE_GRADUATED,
  BADGE_EXPLORER_CNV,
  BADGE_MASTER_CNV,
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
