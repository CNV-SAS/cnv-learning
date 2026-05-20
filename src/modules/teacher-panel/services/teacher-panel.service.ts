// Service del panel docente. Compone repos de courses, enrollments,
// progress, submissions, gradings para alimentar las vistas
// (/teacher overview + /teacher/students/[id]).
//
// Performance MVP: para N alumnos por curso, getStudentRoster hace
// ~3N queries (progressService.getCourseSummary trae 2 + 2 mas para
// last lesson y last submission). Aceptable para volumen MVP
// (10 alumnos = ~30 queries). TODO observacional: si en produccion
// la pagina tarda >1s consistente, considerar una vista SQL pre-
// agregada o batch fetch de lesson_progress + submissions por
// curso una sola vez con group by en TS.

import { enrollmentRepository } from "@/modules/enrollments/data";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { lessonProgressRepository } from "@/modules/progress/data";
import { submissionRepository } from "@/modules/assignments/data/submission.repository";
import { gradingRepository } from "@/modules/assignments/data/grading.repository";
import { progressService } from "@/modules/progress/services/progress.service";
import type { Course } from "@/modules/courses/types";
import type {
  TeacherCourseOverview,
  StudentRosterEntry,
} from "../types";

function maxNullableIso(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a > b ? a : b;
}

async function pendingSubmissionsCount(courseId: string): Promise<number> {
  const submissions =
    await submissionRepository.listSubmittedByCourse(courseId);
  if (submissions.length === 0) return 0;
  const gradings = await gradingRepository.listBySubmissionIds(
    submissions.map((s) => s.id),
  );
  const gradedIds = new Set(gradings.map((g) => g.submission_id));
  return submissions.length - gradedIds.size;
}

export const teacherPanelService = {
  // Overview cards para los cursos pasados por el caller. El page
  // resuelve la lista segun rol (teacher: listForTeacher, admin:
  // listAllAccessible) y se la pasa aqui. Pattern para que el
  // service sea agnostico del rol.
  async getCoursesOverview(
    courses: Course[],
  ): Promise<TeacherCourseOverview[]> {
    if (courses.length === 0) return [];

    return await Promise.all(
      courses.map(async (course) => {
        const enrollments = await enrollmentRepository.listActiveByCourse(
          course.id,
        );
        const userIds = enrollments.map((e) => e.user_id);

        const [summaries, pending] = await Promise.all([
          Promise.all(
            userIds.map((uid) =>
              progressService.getCourseSummary(uid, course.id),
            ),
          ),
          pendingSubmissionsCount(course.id),
        ]);

        const totalPct = summaries.reduce(
          (sum, s) => sum + s.progress.percentage,
          0,
        );
        const avg =
          summaries.length > 0
            ? Math.round(totalPct / summaries.length)
            : 0;

        return {
          course,
          studentsCount: userIds.length,
          averageProgressPercentage: avg,
          pendingSubmissionsCount: pending,
        };
      }),
    );
  },

  // Tabla de alumnos para un curso especifico. RLS valida acceso del
  // teacher al curso; si el caller no tiene RLS para ese curso,
  // listActiveByCourse retorna [].
  async getStudentRoster(
    courseId: string,
  ): Promise<StudentRosterEntry[]> {
    const enrollments =
      await enrollmentRepository.listActiveByCourse(courseId);
    if (enrollments.length === 0) return [];

    const userIds = enrollments.map((e) => e.user_id);
    const profiles = await profileRepository.findByIds(userIds);
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    const rows = await Promise.all(
      userIds.map(async (userId) => {
        const profile = profileById.get(userId);
        if (!profile) return null;

        const [summary, lastLesson, lastSubmission] = await Promise.all([
          progressService.getCourseSummary(userId, courseId),
          lessonProgressRepository.getLastCompletedAtForUserAndCourse(
            userId,
            courseId,
          ),
          submissionRepository.getLastSubmittedAtForUserAndCourse(
            userId,
            courseId,
          ),
        ]);

        return {
          userId,
          studentName: profile.full_name,
          studentEmail: profile.email,
          progressPercentage: summary.progress.percentage,
          lastActivityAt: maxNullableIso(lastLesson, lastSubmission),
        } satisfies StudentRosterEntry;
      }),
    );

    return rows.filter(
      (row): row is StudentRosterEntry => row !== null,
    );
  },
};
