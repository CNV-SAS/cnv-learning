// Service del catalogo expandido de insignias (Bloque 22.2).
// getStudentBadges retorna las 5 del catalogo con earned + earnedAt
// para cada una. Reusa progressService.getRankEarnedDates y consulta
// certificates + corporate_certificates para los achievements.
//
// Signature:
//   getStudentBadges(userId, primaryCourseId | null)
//     -> Array<{badge, earned, earnedAt}>
//
// Si primaryCourseId es null (student sin enrolment), los ranks
// no se calculan (earned=false, earnedAt=null). Los achievements
// se evaluan independientemente.
//
// "Curso primario" en MVP = unico curso del student. En multi-curso
// futuro = primer curso enrolled (caller decide; este service lo
// recibe ya resuelto).

import {
  certificateRepository,
  corporateCertificateRepository,
} from "@/modules/certificates/data";
import { progressService } from "./progress.service";
import { ALL_BADGES, type Badge } from "../lib";

export interface StudentBadgeEntry {
  badge: Badge;
  earned: boolean;
  earnedAt: string | null;
}

// Umbrales de ranks (alineados con getBadge en lib/badges.ts).
// Mantener sincronizados manualmente si cambian.
const RANK_THRESHOLD: Record<string, number> = {
  junior: 0,
  senior: 50,
  master: 85,
};

export const badgesService = {
  async getStudentBadges(
    userId: string,
    primaryCourseId: string | null,
  ): Promise<StudentBadgeEntry[]> {
    // Datos en paralelo segun lo que aplica.
    const [rankDates, summary, validCert, validCorporateCert] =
      await Promise.all([
        primaryCourseId
          ? progressService.getRankEarnedDates(userId, primaryCourseId)
          : Promise.resolve({
              juniorAt: null,
              seniorAt: null,
              masterAt: null,
            }),
        primaryCourseId
          ? progressService.getCourseSummary(userId, primaryCourseId)
          : Promise.resolve(null),
        certificateRepository.listForUser(userId).then((certs) =>
          certs.find((c) => c.status === "valid") ?? null,
        ),
        corporateCertificateRepository.findValidByUser(userId),
      ]);

    const progressPct = summary?.progress.percentage ?? 0;

    return ALL_BADGES.map((badge) => {
      // Ranks: earned segun threshold del progress, earnedAt del
      // rankDates map (junior=enrollment.enrolled_at).
      if (badge.kind === "rank") {
        const threshold = RANK_THRESHOLD[badge.id] ?? 0;
        const earned = primaryCourseId !== null && progressPct >= threshold;
        if (!earned) return { badge, earned: false, earnedAt: null };
        const date =
          badge.id === "junior"
            ? rankDates.juniorAt
            : badge.id === "senior"
              ? rankDates.seniorAt
              : badge.id === "master"
                ? rankDates.masterAt
                : null;
        return { badge, earned: true, earnedAt: date };
      }
      // Achievements: trigger discreto.
      if (badge.id === "graduated") {
        return {
          badge,
          earned: validCert !== null,
          earnedAt: validCert?.issued_at ?? null,
        };
      }
      if (badge.id === "professional_cnv") {
        return {
          badge,
          earned: validCorporateCert !== null,
          earnedAt: validCorporateCert?.issued_at ?? null,
        };
      }
      // Default fallthrough (no deberia pasar).
      return { badge, earned: false, earnedAt: null };
    });
  },
};
