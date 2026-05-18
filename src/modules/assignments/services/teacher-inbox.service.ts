// Service: bandeja del docente. Compone submissions accesibles
// (submitted, sin grading) con sus assignments + cursos + estudiantes
// para mostrar en la tabla del page /teacher.
//
// Decisiones:
//   - listSubmittedAccessible confia en RLS para filtrar a los
//     cursos del teacher autenticado (no hardcodea teacherId en
//     WHERE).
//   - Fetch bulk en paralelo de assignments + profiles + gradings
//     tras tener los IDs (Bloque 4.5-perf: evitar N+1).
//   - Filtra OUT las submissions que ya tienen grading (= ya
//     calificadas, no pendientes).
//   - Para resolver courseTitle, fetch en paralelo de modules +
//     courses a partir de assignment.module_id (assignment no trae
//     course directo).

import { submissionRepository } from "@/modules/assignments/data/submission.repository";
import { gradingRepository } from "@/modules/assignments/data/grading.repository";
import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { moduleRepository } from "@/modules/courses/data/module.repository";
import { courseRepository } from "@/modules/courses/data/course.repository";
import type { Assignment, Submission } from "@/modules/assignments/types";
import type { Profile } from "@/modules/auth/types";

export interface PendingSubmissionEntry {
  submission: Submission;
  assignment: Assignment;
  student: Profile | null;
  courseTitle: string;
}

export const teacherInboxService = {
  async getPendingSubmissions(): Promise<PendingSubmissionEntry[]> {
    const submissions = await submissionRepository.listSubmittedAccessible();
    if (submissions.length === 0) return [];

    const assignmentIds = Array.from(
      new Set(submissions.map((s) => s.assignment_id)),
    );
    const userIds = Array.from(new Set(submissions.map((s) => s.user_id)));
    const submissionIds = submissions.map((s) => s.id);

    // Phase 1: assignments + students + gradings en paralelo.
    const [assignmentsRaw, students, gradings] = await Promise.all([
      Promise.all(assignmentIds.map((id) => assignmentRepository.findById(id))),
      profileRepository.findByIds(userIds),
      gradingRepository.listBySubmissionIds(submissionIds),
    ]);

    const assignments = assignmentsRaw.filter(
      (a): a is Assignment => a !== null,
    );
    const assignmentById = new Map(assignments.map((a) => [a.id, a]));
    const studentById = new Map(students.map((s) => [s.id, s]));
    const gradedSubmissionIds = new Set(
      gradings.map((g) => g.submission_id),
    );

    // Phase 2: modules + courses para resolver courseTitle.
    const moduleIds = Array.from(
      new Set(assignments.map((a) => a.module_id)),
    );
    const modulesRaw = await Promise.all(
      moduleIds.map((id) => moduleRepository.findById(id)),
    );
    const modules = modulesRaw.filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const courseIds = Array.from(new Set(modules.map((m) => m.course_id)));
    const coursesRaw = await Promise.all(
      courseIds.map((id) => courseRepository.findById(id)),
    );
    const courseById = new Map(
      coursesRaw
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c.id, c]),
    );

    // Componer + filter pending.
    return submissions
      .filter((s) => !gradedSubmissionIds.has(s.id))
      .map((submission): PendingSubmissionEntry | null => {
        const assignment = assignmentById.get(submission.assignment_id);
        if (!assignment) return null;
        const moduleRow = moduleById.get(assignment.module_id);
        const courseTitle = moduleRow
          ? (courseById.get(moduleRow.course_id)?.title ?? "")
          : "";
        return {
          submission,
          assignment,
          student: studentById.get(submission.user_id) ?? null,
          courseTitle,
        };
      })
      .filter((entry): entry is PendingSubmissionEntry => entry !== null);
  },
};
