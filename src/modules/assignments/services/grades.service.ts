// Service: agrega assignments + submissions + gradings del user en
// un curso para construir el libro de notas. 3 queries: lista todas
// las assignments del curso, luego en paralelo las submissions del
// user en bulk + las gradings via submissionIds.
//
// El segundo paralelo depende del resultado del primero
// (necesitamos assignment.id antes de pedir submissions). Por eso
// son dos await sequenciales pero el segundo es Promise.all interno.

import {
  assignmentRepository,
  submissionRepository,
  gradingRepository,
} from "@/modules/assignments/data";
import type { Assignment, Submission, Grading } from "../types";

export interface CourseGradeEntry {
  assignment: Assignment;
  submission: Submission | null;
  grading: Grading | null;
}

export const gradesService = {
  async getCourseGrades(
    userId: string,
    courseId: string,
  ): Promise<CourseGradeEntry[]> {
    const assignments = await assignmentRepository.listByCourse(courseId);
    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);
    const submissions =
      await submissionRepository.listByAssignmentIdsForUser(
        assignmentIds,
        userId,
      );

    const submissionIds = submissions.map((s) => s.id);
    const gradings =
      submissionIds.length > 0
        ? await gradingRepository.listBySubmissionIds(submissionIds)
        : [];

    const submissionByAssignmentId = new Map(
      submissions.map((s) => [s.assignment_id, s]),
    );
    const gradingBySubmissionId = new Map(
      gradings.map((g) => [g.submission_id, g]),
    );

    return assignments.map((assignment) => {
      const submission = submissionByAssignmentId.get(assignment.id) ?? null;
      const grading = submission
        ? gradingBySubmissionId.get(submission.id) ?? null
        : null;
      return { assignment, submission, grading };
    });
  },
};
