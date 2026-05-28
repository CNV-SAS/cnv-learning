// Service de progress. Bloque 4.5 lo creo con markLessonCompleted
// thin; Bloque 5.1 lo extiende con calculos para dashboard; Bloque
// 12.6 agrega la emision automatica del certificado al cruzar 100%.
//
// Bloque post-23: refactor al nuevo modelo de progreso ponderado.
// El curso ya no se mide por count simple de lecciones; ahora es
// suma ponderada de los modulos donde cada modulo aporta segun su
// weight normalizado y el % de items completados del modulo
// (lecciones + tareas con is_required=true).
//
// API publica:
//   - markLessonCompleted: persiste + side effect (emite cert si
//     el curso llega a 100% por primera vez O re-llega tras
//     agregarse contenido nuevo).
//   - tryEmitCertificateForCourse: helper extraido para que
//     submitAssignment dispare la misma logica cuando una tarea
//     obligatoria completa lleva al curso al 100%.
//   - getCourseSummary: progreso ponderado + badge + continueLesson.
//   - getModulesWithProgress: por modulo, breakdown del propio modulo
//     (lecciones + tareas obligatorias). El % por modulo NO esta
//     ponderado entre modulos (es el % del modulo en si mismo,
//     util para barras de progreso del course view).
//   - getRankEarnedDates: reescrito para iterar timeline unificado
//     de eventos (lesson_progress + submissions) ordenado por
//     timestamp, recalculando progreso ponderado en cada step.

import { moduleRepository } from "@/modules/courses/data/module.repository";
import { lessonRepository } from "@/modules/courses/data/lesson.repository";
import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { submissionRepository } from "@/modules/assignments/data/submission.repository";
import type { Lesson, Module } from "@/modules/courses/types";
import { certificateService } from "@/modules/certificates/services";
import { enrollmentRepository } from "@/modules/enrollments/data";
import { logger } from "@/core/logger/logger";
import { lessonProgressRepository } from "../data/lesson-progress.repository";
import {
  calculateProgress,
  calculateWeightedCourseProgress,
  computeRankEarnedDatesFromTimeline,
  getBadge,
  pickFirstUncompleted,
  type Badge,
  type ModuleProgressInput,
  type ProgressSummary,
  type TimelineEvent,
} from "../lib";

export interface CourseSummary {
  progress: ProgressSummary;
  badge: Badge;
  continueLesson: Lesson | null;
}

export interface ModuleWithProgress {
  module: Module;
  lessons: Lesson[];
  progress: ProgressSummary;
}

export interface RankEarnedDates {
  juniorAt: string | null;
  seniorAt: string | null;
  masterAt: string | null;
}

// Resuelve modulos + lecciones + assignments del curso + completed
// del user en una sola pasada. Usado por getCourseSummary,
// getModulesWithProgress y getRankEarnedDates para evitar duplicar
// fetches. 5 queries paralelas para un user en un curso.
async function loadCourseProgressContext(userId: string, courseId: string) {
  const modules = await moduleRepository.listByCourse(courseId);

  const [
    lessonsByModule,
    assignmentsByModule,
    completedLessonIds,
    submittedAssignmentIds,
  ] = await Promise.all([
    Promise.all(modules.map((m) => lessonRepository.listByModule(m.id))),
    Promise.all(
      modules.map((m) => assignmentRepository.listByModule(m.id)),
    ),
    lessonProgressRepository.listCompletedLessonIdsForUserAndCourse(
      userId,
      courseId,
    ),
    submissionRepository.listSubmittedOrGradedAssignmentIdsForUserAndCourse(
      userId,
      courseId,
    ),
  ]);

  const completedLessonSet = new Set(completedLessonIds);
  const submittedAssignmentSet = new Set(submittedAssignmentIds);

  // Por modulo: items (lecciones + tareas obligatorias) + breakdown
  // de cuantos completo el user.
  const perModule = modules.map((module, idx) => {
    const lessons = lessonsByModule[idx];
    const assignments = assignmentsByModule[idx];
    const requiredAssignments = assignments.filter(
      (a) => a.is_required === true,
    );

    const completedLessons = lessons.filter((l) =>
      completedLessonSet.has(l.id),
    ).length;
    const completedRequiredAssignments = requiredAssignments.filter((a) =>
      submittedAssignmentSet.has(a.id),
    ).length;

    return {
      module,
      lessons,
      assignments,
      requiredAssignments,
      completedLessons,
      completedRequiredAssignments,
    };
  });

  return {
    modules,
    perModule,
    allLessons: lessonsByModule.flat(),
    completedLessonSet,
  };
}

export const progressService = {
  async markLessonCompleted(
    userId: string,
    lessonId: string,
  ): Promise<void> {
    await lessonProgressRepository.markCompleted(userId, lessonId);

    // Emision automatica del certificado si el curso llega a 100%
    // (Bloque 12.6, refactor post-23). Fault-tolerant.
    try {
      const lesson = await lessonRepository.findById(lessonId);
      if (!lesson) return;
      const moduleRow = await moduleRepository.findById(lesson.module_id);
      if (!moduleRow) return;
      await this.tryEmitCertificateForCourse(userId, moduleRow.course_id);
    } catch (e) {
      logger.warn(
        "Certificate emission flow threw unexpected (non-blocking)",
        {
          userId,
          lessonId,
          error: e instanceof Error ? e.message : String(e),
        },
      );
    }
  },

  // Bloque post-23: helper extraido para reuse desde submitAssignment.
  // Verifica si el curso esta al 100% y, si es asi, dispara
  // certificateService.issueCertificate que internamente decide kind
  // (completion vs update). Fault-tolerant.
  async tryEmitCertificateForCourse(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const summary = await this.getCourseSummary(userId, courseId);
    if (summary.progress.percentage !== 100) return;

    const result = await certificateService.issueCertificate({
      userId,
      courseId,
      isCourseComplete: true,
    });
    if (!result.ok) {
      logger.warn("Certificate emission did not succeed (non-blocking)", {
        userId,
        courseId,
        errorCode: result.error.code,
        errorMessage: result.error.message,
      });
    }
  },

  async getCourseSummary(
    userId: string,
    courseId: string,
  ): Promise<CourseSummary> {
    const ctx = await loadCourseProgressContext(userId, courseId);

    const moduleInputs: ModuleProgressInput[] = ctx.perModule.map((row) => ({
      weight: Number(row.module.weight ?? 0),
      completedLessons: row.completedLessons,
      totalLessons: row.lessons.length,
      completedRequiredAssignments: row.completedRequiredAssignments,
      totalRequiredAssignments: row.requiredAssignments.length,
    }));

    const progress = calculateWeightedCourseProgress(moduleInputs);
    const badge = getBadge(progress.percentage);
    const continueLesson = pickFirstUncompleted(
      ctx.allLessons,
      ctx.completedLessonSet,
    );

    return { progress, badge, continueLesson };
  },

  async getModulesWithProgress(
    userId: string,
    courseId: string,
  ): Promise<ModuleWithProgress[]> {
    const ctx = await loadCourseProgressContext(userId, courseId);

    return ctx.perModule.map((row) => {
      const totalItems =
        row.lessons.length + row.requiredAssignments.length;
      const completedItems =
        row.completedLessons + row.completedRequiredAssignments;
      const base = calculateProgress(completedItems, totalItems);
      return {
        module: row.module,
        lessons: row.lessons,
        progress: {
          ...base,
          completedLessons: row.completedLessons,
          totalLessons: row.lessons.length,
          completedRequiredAssignments: row.completedRequiredAssignments,
          totalRequiredAssignments: row.requiredAssignments.length,
        },
      };
    });
  },

  // Bloque post-23 rewrite: itera timeline unificado de eventos
  // (lecciones completadas + tareas obligatorias entregadas) ordenado
  // por timestamp, recalculando progreso ponderado en cada step para
  // detectar exactamente cuando se cruzaron los thresholds de Senior
  // (50%) y Master (85%). Junior queda en enrollment.enrolled_at.
  async getRankEarnedDates(
    userId: string,
    courseId: string,
  ): Promise<RankEarnedDates> {
    const enrollment =
      await enrollmentRepository.findActiveByUserAndCourse(userId, courseId);
    if (!enrollment) {
      return { juniorAt: null, seniorAt: null, masterAt: null };
    }

    const ctx = await loadCourseProgressContext(userId, courseId);

    // Reverse indices para acumular counts del modulo correcto en
    // O(1) por evento del timeline.
    const lessonIdToModuleIdx = new Map<string, number>();
    const requiredAssignmentIdToModuleIdx = new Map<string, number>();
    for (let idx = 0; idx < ctx.perModule.length; idx++) {
      const row = ctx.perModule[idx];
      for (const l of row.lessons) lessonIdToModuleIdx.set(l.id, idx);
      for (const a of row.requiredAssignments) {
        requiredAssignmentIdToModuleIdx.set(a.id, idx);
      }
    }

    // Counter mutable por modulo. Empieza en 0 y crece con cada
    // evento del timeline.
    const counters: ModuleProgressInput[] = ctx.perModule.map((row) => ({
      weight: Number(row.module.weight ?? 0),
      completedLessons: 0,
      totalLessons: row.lessons.length,
      completedRequiredAssignments: 0,
      totalRequiredAssignments: row.requiredAssignments.length,
    }));

    const [lessonProgressRows, submissionRows] = await Promise.all([
      lessonProgressRepository.listForUserAndCourse(userId, courseId),
      submissionRepository.listSubmittedOrGradedTimelineForUserAndCourse(
        userId,
        courseId,
      ),
    ]);

    const events: TimelineEvent[] = [];
    for (const row of lessonProgressRows) {
      const moduleIdx = lessonIdToModuleIdx.get(row.lesson_id);
      if (moduleIdx === undefined) continue;
      events.push({
        timestamp: row.completed_at,
        kind: "lesson",
        moduleIdx,
      });
    }
    for (const row of submissionRows) {
      const moduleIdx = requiredAssignmentIdToModuleIdx.get(row.assignment_id);
      // Si el submission es de una tarea NO obligatoria, no esta en
      // el index y skipeamos (no contribuye al progreso).
      if (moduleIdx === undefined) continue;
      events.push({
        timestamp: row.submitted_at,
        kind: "assignment",
        moduleIdx,
      });
    }

    const { seniorAt, masterAt } = computeRankEarnedDatesFromTimeline(
      counters,
      events,
    );

    return {
      juniorAt: enrollment.enrolled_at,
      seniorAt,
      masterAt,
    };
  },
};
