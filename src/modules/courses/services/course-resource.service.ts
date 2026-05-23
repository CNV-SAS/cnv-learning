// Service: recursos del curso (Bloque 20). Orquesta lecturas con
// agrupacion por scope (general vs modulo) para que la UI no haga
// la transformacion. Reusa canEditCourseResources para writes
// (incorporadas en 20.2).
//
// Bloque 20.1: solo lectura. Listado agrupado + suma para quota.
// Bloque 20.2 agrega create/update/delete + upload flow.

import {
  courseRepository,
  courseResourceRepository,
} from "@/modules/courses/data";
import type { CourseResource } from "@/modules/courses/types";

// 500 MB en bytes (decision del planning Bloque 20: 500 MB por curso).
export const COURSE_STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;
// 20 MB por archivo individual (mismo planning).
export const COURSE_RESOURCE_FILE_MAX_BYTES = 20 * 1024 * 1024;

// MIME types permitidos para upload de archivos (A1 del planning):
// PDF, DOCX, PPTX/PPT, MP3, M4A. Sin MP4 video (link externo),
// sin imagenes (avatar upload usa otro flow).
export const COURSE_RESOURCE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "audio/mpeg",
  "audio/mp4",
] as const;

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
};
