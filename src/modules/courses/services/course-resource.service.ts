// Service: recursos del curso (Bloque 20). Orquesta lecturas con
// agrupacion por scope (general vs modulo) para que la UI no haga
// la transformacion. Reusa canEditCourseResources para writes.
//
// Las constantes de quota + MIME types viven en
// data/course-resource-constants.ts (browser-safe).

import { createAdminClient } from "@/lib/supabase/admin";
import {
  courseRepository,
  courseResourceRepository,
} from "@/modules/courses/data";
import {
  COURSE_RESOURCE_ALLOWED_MIME_TYPES,
  COURSE_RESOURCE_FILE_MAX_BYTES,
  COURSE_STORAGE_QUOTA_BYTES,
} from "@/modules/courses/data/course-resource-constants";
import { canEditCourseResources } from "@/modules/courses/policies";
import {
  AppError,
  AuthorizationError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type {
  CourseResource,
  ResourceKind,
} from "@/modules/courses/types";

export interface CourseResourcesGrouped {
  // Recursos sin module_id (scope general del curso).
  general: CourseResource[];
  // Recursos con module_id, agrupados. La clave es el moduleId.
  byModule: Map<string, CourseResource[]>;
  // Suma de size_bytes de archivos (kind='file'). Links no cuentan.
  totalSizeBytes: number;
  // Quota disponible: COURSE_STORAGE_QUOTA_BYTES - totalSizeBytes.
  // Puede ser negativo si por alguna razon historica el curso excede
  // (no deberia pasar con el enforcement de 20.2).
  remainingBytes: number;
}

export const courseResourceService = {
  // Lista recursos del curso agrupados por scope + calcula quota.
  // La UI usa esto para renderizar 2 secciones (General + por modulo)
  // y la barra de uso "X MB / 500 MB" en el editor.
  async listByCourseGrouped(
    courseId: string,
  ): Promise<CourseResourcesGrouped> {
    const all = await courseResourceRepository.listByCourse(courseId);

    const general: CourseResource[] = [];
    const byModule = new Map<string, CourseResource[]>();
    let totalSizeBytes = 0;

    for (const resource of all) {
      if (resource.kind === "file" && resource.size_bytes !== null) {
        totalSizeBytes += Number(resource.size_bytes);
      }
      if (resource.module_id === null) {
        general.push(resource);
      } else {
        const existing = byModule.get(resource.module_id) ?? [];
        existing.push(resource);
        byModule.set(resource.module_id, existing);
      }
    }

    return {
      general,
      byModule,
      totalSizeBytes,
      remainingBytes: COURSE_STORAGE_QUOTA_BYTES - totalSizeBytes,
    };
  },

  // Helper para que la UI sepa rapido si un curso existe sin tener
  // que hacer la query manualmente. Usado por la page del editor de
  // recursos antes de renderizar.
  async ensureCourseExists(courseId: string): Promise<boolean> {
    const course = await courseRepository.findById(courseId);
    return course !== null;
  },

  // -----------------------------------------------------------------
  // Writes (Bloque 20.2)
  // -----------------------------------------------------------------

  async createResource(params: {
    user: AuthenticatedUser;
    courseId: string;
    moduleId: string | null;
    kind: ResourceKind;
    title: string;
    description: string | null;
    // Solo para kind='file': el blob ya esta en Storage cuando se
    // llama esta function. El service NO sube; solo persiste la row.
    storagePath: string | null;
    sizeBytes: number | null;
    mimeType: string | null;
    // Solo para kind='link'.
    externalUrl: string | null;
  }): Promise<Result<CourseResource, AppError>> {
    const auth = await authorizeCourseEdit(params.user, params.courseId);
    if (!auth.ok) return err(auth.error);

    // Validacion cruzada de campos por kind. Defense in depth: la
    // validacion Zod ya filtra esto, pero el service vuelve a chequear
    // por si llega input mal-formado de un caller no estandar.
    if (params.kind === "file") {
      if (
        !params.storagePath ||
        params.sizeBytes === null ||
        !params.mimeType
      ) {
        return err(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "Faltan datos del archivo (storagePath, sizeBytes, mimeType).",
          ),
        );
      }
      if (!COURSE_RESOURCE_ALLOWED_MIME_TYPES.has(params.mimeType)) {
        return err(
          new DomainError(
            ErrorCodes.FILE_MIME_TYPE_NOT_ALLOWED,
            "Tipo de archivo no permitido.",
          ),
        );
      }
      if (params.sizeBytes > COURSE_RESOURCE_FILE_MAX_BYTES) {
        return err(
          new DomainError(
            ErrorCodes.FILE_TOO_LARGE,
            "El archivo supera el máximo de 20 MB.",
          ),
        );
      }
      // Quota total del curso: suma actual + este nuevo archivo.
      const currentTotal =
        await courseResourceRepository.sumStorageBytesForCourse(
          params.courseId,
        );
      if (currentTotal + params.sizeBytes > COURSE_STORAGE_QUOTA_BYTES) {
        return err(
          new DomainError(
            ErrorCodes.COURSE_STORAGE_QUOTA_EXCEEDED,
            `El curso superaría la cuota de 500 MB (actual ${Math.round(currentTotal / (1024 * 1024))} MB).`,
          ),
        );
      }
    } else {
      if (!params.externalUrl) {
        return err(
          new ValidationError(
            ErrorCodes.VALIDATION_FAILED,
            "Falta la URL externa del recurso.",
          ),
        );
      }
    }

    const resource = await courseResourceRepository.create({
      course_id: params.courseId,
      module_id: params.moduleId,
      kind: params.kind,
      title: params.title,
      description: params.description,
      storage_path: params.storagePath,
      external_url: params.externalUrl,
      size_bytes: params.sizeBytes,
      mime_type: params.mimeType,
      created_by: params.user.id,
    });
    return ok(resource);
  },

  // Solo edita campos no-fisicos (title, description). Para cambiar
  // el archivo, el docente borra el recurso y crea uno nuevo (mismo
  // patron que lesson_attachments).
  async updateResource(params: {
    user: AuthenticatedUser;
    resourceId: string;
    title: string;
    description: string | null;
  }): Promise<Result<CourseResource, AppError>> {
    const resource = await courseResourceRepository.findById(
      params.resourceId,
    );
    if (!resource) {
      return err(
        new NotFoundError(
          ErrorCodes.COURSE_RESOURCE_NOT_FOUND,
          "Recurso no encontrado.",
        ),
      );
    }
    const auth = await authorizeCourseEdit(params.user, resource.course_id);
    if (!auth.ok) return err(auth.error);

    const updated = await courseResourceRepository.update(params.resourceId, {
      title: params.title,
      description: params.description,
    });
    return ok(updated);
  },

  // Borrado simple (sin audit, sin blocking: los recursos no tienen
  // dependencias downstream). Best-effort delete del blob de Storage
  // si kind='file'; si falla, log a Sentry y continua (la row se
  // borra igual; el blob huerfano se limpia en Bloque 22).
  async deleteResource(params: {
    user: AuthenticatedUser;
    resourceId: string;
  }): Promise<Result<void, AppError>> {
    const resource = await courseResourceRepository.findById(
      params.resourceId,
    );
    if (!resource) {
      return err(
        new NotFoundError(
          ErrorCodes.COURSE_RESOURCE_NOT_FOUND,
          "Recurso no encontrado.",
        ),
      );
    }
    const auth = await authorizeCourseEdit(params.user, resource.course_id);
    if (!auth.ok) return err(auth.error);

    if (resource.kind === "file" && resource.storage_path) {
      // BYPASS RLS via admin client porque la RLS DELETE de
      // storage.objects valida que el caller sea teacher asignado al
      // courseId del path (regex pre-check), pero ya validamos arriba
      // que el caller tiene canEditCourseResources sobre este curso.
      // El admin client garantiza que la limpieza ocurre incluso si
      // por alguna razon historica el path no parsea via RLS.
      const supabase = createAdminClient();
      const { error: storageError } = await supabase.storage
        .from("course-resources")
        .remove([resource.storage_path]);
      if (storageError) {
        logger.error("Failed to delete course-resource blob", {
          resourceId: params.resourceId,
          storagePath: resource.storage_path,
          error: storageError.message,
        });
        // NO retornar error: el blob huerfano queda para cleanup B22.
      }
    }

    await courseResourceRepository.delete(params.resourceId);
    return ok(undefined);
  },
};

// Helper de auth reusado entre los 3 metodos mutativos. Centraliza
// el fetch de course + isTeacherOfCourse + canEditCourseResources.
async function authorizeCourseEdit(
  user: AuthenticatedUser,
  courseId: string,
): Promise<Result<{ courseId: string }, AppError>> {
  const [course, isTeacherOfCourse] = await Promise.all([
    courseRepository.findById(courseId),
    user.role === "teacher"
      ? courseRepository.isTeacherOfCourse(user.id, courseId)
      : Promise.resolve(false),
  ]);
  if (!course) {
    return err(
      new NotFoundError(ErrorCodes.COURSE_NOT_FOUND, "Curso no encontrado."),
    );
  }
  const allowed = canEditCourseResources(user, {
    courseExists: true,
    isTeacherOfCourse,
  });
  if (!allowed) {
    return err(
      new AuthorizationError(
        ErrorCodes.AUTHZ_CANNOT_EDIT_COURSE_RESOURCES,
        "No puedes editar los recursos de este curso.",
      ),
    );
  }
  return ok({ courseId });
}
