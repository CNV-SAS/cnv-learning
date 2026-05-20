// Types base del modulo teacher-panel. Composiciones cross-domain
// para alimentar las vistas del docente (overview + roster +
// detalle de alumno).

import type { Course } from "@/modules/courses/types";

export interface TeacherCourseOverview {
  course: Course;
  studentsCount: number;
  // Promedio de progress.percentage de los enrolled. Redondeado a
  // entero. 0 si no hay alumnos.
  averageProgressPercentage: number;
  // Entregas submitted sin grading aun para este curso.
  pendingSubmissionsCount: number;
}

export interface StudentRosterEntry {
  userId: string;
  studentName: string;
  studentEmail: string;
  progressPercentage: number;
  // Max(last lesson completed_at, last submission submitted_at). null
  // si el alumno no tiene actividad registrada en el curso.
  lastActivityAt: string | null;
}
