// Service: orquestador de gestion del calendario por curso.
// ARCHITECTURE.md regla 2 (action thin -> service; logica aqui).
//
// 3 operaciones (CRUD):
//   1. createEvent: canEditCalendar con isTeacherOfCourse resuelto
//      + audit calendar_event.created.
//   2. updateEvent: lookup evento -> canEditCalendar (con
//      isTeacherOfCourse del course_id del evento) + audit
//      calendar_event.updated con previous/new fields.
//   3. deleteEvent: lookup -> canEditCalendar + audit ANTES del
//      delete (mismo pattern que user.deleted: snapshot preservado
//      en metadata aunque la row desaparezca).

import { courseEventRepository } from "@/modules/calendar/data";
import { canEditCalendar } from "@/modules/calendar/policies";
import { courseRepository } from "@/modules/courses/data";
import { auditRepository } from "@/modules/audit/data";
import {
  AppError,
  AuthorizationError,
  NotFoundError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { CourseEvent } from "@/modules/calendar/types";

interface CreateEventParams {
  actor: AuthenticatedUser;
  courseId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
}

interface UpdateEventParams {
  actor: AuthenticatedUser;
  eventId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
}

interface DeleteEventParams {
  actor: AuthenticatedUser;
  eventId: string;
}

function authzCannotEdit(): AuthorizationError {
  return new AuthorizationError(
    ErrorCodes.AUTHZ_CANNOT_EDIT_CALENDAR,
    "No puedes editar el calendario de este curso.",
  );
}

function notFoundEvent(): NotFoundError {
  return new NotFoundError(
    ErrorCodes.CALENDAR_EVENT_NOT_FOUND,
    "Evento no encontrado.",
  );
}

// Resuelve isTeacherOfCourse para la policy. Admin no necesita el
// context (la policy ya bypassea), pero pasamos el valor real para
// que el audit metadata refleje si era teacher o admin actor.
async function resolveIsTeacherOfCourse(
  actor: AuthenticatedUser,
  courseId: string,
): Promise<boolean> {
  if (actor.role !== "teacher") return false;
  return courseRepository.isTeacherOfCourse(actor.id, courseId);
}

export const calendarService = {
  async createEvent(
    params: CreateEventParams,
  ): Promise<Result<CourseEvent, AppError>> {
    const course = await courseRepository.findById(params.courseId);
    if (!course) {
      return err(
        new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
      );
    }

    const isTeacherOfCourse = await resolveIsTeacherOfCourse(
      params.actor,
      params.courseId,
    );

    if (!canEditCalendar(params.actor, { isTeacherOfCourse })) {
      return err(authzCannotEdit());
    }

    const event = await courseEventRepository.create({
      course_id: params.courseId,
      title: params.title,
      description: params.description ?? null,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
      created_by: params.actor.id,
    });

    await auditRepository.record({
      event: "calendar_event.created",
      resourceType: "calendar_event",
      resourceId: event.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        courseId: params.courseId,
        courseTitle: course.title,
        title: params.title,
        startsAt: params.startsAt,
        endsAt: params.endsAt ?? null,
      },
    });

    return ok(event);
  },

  async updateEvent(
    params: UpdateEventParams,
  ): Promise<Result<CourseEvent, AppError>> {
    const existing = await courseEventRepository.findById(params.eventId);
    if (!existing) return err(notFoundEvent());

    const course = await courseRepository.findById(existing.course_id);
    if (!course) {
      return err(
        new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
      );
    }

    const isTeacherOfCourse = await resolveIsTeacherOfCourse(
      params.actor,
      existing.course_id,
    );

    if (!canEditCalendar(params.actor, { isTeacherOfCourse })) {
      return err(authzCannotEdit());
    }

    const updated = await courseEventRepository.update(params.eventId, {
      title: params.title,
      description: params.description ?? null,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
    });

    await auditRepository.record({
      event: "calendar_event.updated",
      resourceType: "calendar_event",
      resourceId: existing.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        courseId: existing.course_id,
        courseTitle: course.title,
        previous: {
          title: existing.title,
          description: existing.description,
          startsAt: existing.starts_at,
          endsAt: existing.ends_at,
        },
        next: {
          title: params.title,
          description: params.description ?? null,
          startsAt: params.startsAt,
          endsAt: params.endsAt ?? null,
        },
      },
    });

    return ok(updated);
  },

  async deleteEvent(
    params: DeleteEventParams,
  ): Promise<Result<void, AppError>> {
    const existing = await courseEventRepository.findById(params.eventId);
    if (!existing) return err(notFoundEvent());

    const course = await courseRepository.findById(existing.course_id);
    if (!course) {
      return err(
        new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
      );
    }

    const isTeacherOfCourse = await resolveIsTeacherOfCourse(
      params.actor,
      existing.course_id,
    );

    if (!canEditCalendar(params.actor, { isTeacherOfCourse })) {
      return err(authzCannotEdit());
    }

    // Audit ANTES del delete: preserva snapshot del evento aunque
    // la row desaparezca (mismo patron que user.deleted del
    // Bloque 14.3).
    await auditRepository.record({
      event: "calendar_event.deleted",
      resourceType: "calendar_event",
      resourceId: existing.id,
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      metadata: {
        courseId: existing.course_id,
        courseTitle: course.title,
        title: existing.title,
        description: existing.description,
        startsAt: existing.starts_at,
        endsAt: existing.ends_at,
      },
    });

    await courseEventRepository.deleteById(params.eventId);
    return ok(undefined);
  },
};
