// Service: cleanup de blobs en Storage al eliminar un curso.
// Smoke E2E round 3 Diagnostico B: courseRepository.delete() solo
// dispara CASCADE en las tablas relacionadas; los archivos en
// Storage (course-resources, submissions, academic-certificates)
// quedaban huerfanos sin reference. Este service los recolecta
// ANTES del CASCADE y los borra best-effort con Promise.allSettled
// para que un fallo de un bucket no bloquee los otros.
//
// Flujo:
//   1. collectCourseStoragePaths(courseId) lee rows de las 3 tablas
//      de Storage relacionadas. Usa admin client (service role) por
//      consistencia: en deleteCourse el actor es admin y queremos
//      ver TODO el contenido, ignorando RLS por path/teacher.
//   2. deleteCourseStorage(paths) llama storage.remove() por bucket.
//      Promise.allSettled para tolerancia. Devuelve conteo por
//      bucket de deleted + failed que el caller mete en audit log.
//
// Fault-tolerance: si storage no responde, el delete del curso debe
// continuar. Mejor huerfano que delete bloqueado (correctness >
// tidiness). El caller registra el resultado en audit para que
// admin pueda hacer cleanup manual despues si lo necesita.

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/core/logger/logger";

export interface CourseStoragePaths {
  courseResources: string[];
  submissions: string[];
  academicCertificates: string[];
}

export interface CourseStorageDeleteResult {
  deleted: {
    courseResources: number;
    submissions: number;
    academicCertificates: number;
  };
  failed: {
    courseResources: number;
    submissions: number;
    academicCertificates: number;
  };
}

const COURSE_RESOURCES_BUCKET = "course-resources";
const SUBMISSIONS_BUCKET = "submissions";
const ACADEMIC_CERTS_BUCKET = "academic-certificates";

export const courseStorageCleanupService = {
  // Resuelve los storage_path de los 3 buckets tied al curso. Usa
  // admin client para ver TODO sin filtrar por RLS (el admin esta
  // borrando el curso entero; queremos ver todos los blobs, incluso
  // los que su sesion regular no podria listar por path-RLS).
  async collectCourseStoragePaths(
    courseId: string,
  ): Promise<CourseStoragePaths> {
    const supabase = createAdminClient();

    // course_resources: row contiene storage_path. Filtramos por
    // kind='file' porque kind='link' no tiene blob.
    const [resourcesResult, submissionsResult, academicCertsResult] =
      await Promise.all([
        supabase
          .from("course_resources")
          .select("storage_path")
          .eq("course_id", courseId)
          .eq("kind", "file")
          .not("storage_path", "is", null),
        // submissions con storage_path no-null que pertenezcan a
        // assignments del curso (via modules.course_id).
        supabase
          .from("submissions")
          .select(
            "storage_path, assignments!inner(modules!inner(course_id))",
          )
          .eq("assignments.modules.course_id", courseId)
          .not("storage_path", "is", null),
        supabase
          .from("academic_certificates")
          .select("storage_path")
          .eq("course_id", courseId)
          .not("storage_path", "is", null),
      ]);

    if (resourcesResult.error) {
      logger.warn("collectCourseStoragePaths: course_resources query failed", {
        courseId,
        error: resourcesResult.error.message,
      });
    }
    if (submissionsResult.error) {
      logger.warn("collectCourseStoragePaths: submissions query failed", {
        courseId,
        error: submissionsResult.error.message,
      });
    }
    if (academicCertsResult.error) {
      logger.warn(
        "collectCourseStoragePaths: academic_certificates query failed",
        {
          courseId,
          error: academicCertsResult.error.message,
        },
      );
    }

    const courseResources =
      (resourcesResult.data ?? [])
        .map((r) => r.storage_path)
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    const submissions =
      (submissionsResult.data ?? [])
        .map((r) => r.storage_path as string | null)
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    const academicCertificates =
      (academicCertsResult.data ?? [])
        .map((r) => r.storage_path)
        .filter((p): p is string => typeof p === "string" && p.length > 0);

    return { courseResources, submissions, academicCertificates };
  },

  // Borra blobs en los 3 buckets en paralelo. Promise.allSettled
  // para que el fallo de un bucket no bloquee los otros (best-effort:
  // mejor huerfano que delete del curso bloqueado).
  //
  // storage.from(bucket).remove([]) con array vacio devuelve sin
  // hacer request; corto-circuitamos arriba por claridad.
  async deleteCourseStorage(
    paths: CourseStoragePaths,
  ): Promise<CourseStorageDeleteResult> {
    const supabase = createAdminClient();

    const [resourcesSettled, submissionsSettled, academicSettled] =
      await Promise.allSettled([
        paths.courseResources.length > 0
          ? supabase.storage
              .from(COURSE_RESOURCES_BUCKET)
              .remove(paths.courseResources)
          : Promise.resolve({ data: [], error: null }),
        paths.submissions.length > 0
          ? supabase.storage
              .from(SUBMISSIONS_BUCKET)
              .remove(paths.submissions)
          : Promise.resolve({ data: [], error: null }),
        paths.academicCertificates.length > 0
          ? supabase.storage
              .from(ACADEMIC_CERTS_BUCKET)
              .remove(paths.academicCertificates)
          : Promise.resolve({ data: [], error: null }),
      ]);

    function tally(
      settled: PromiseSettledResult<{
        data: unknown;
        error: { message: string } | null;
      }>,
      bucket: string,
      requested: number,
    ): { deleted: number; failed: number } {
      if (settled.status === "rejected") {
        logger.warn("deleteCourseStorage: bucket call rejected", {
          bucket,
          reason:
            settled.reason instanceof Error
              ? settled.reason.message
              : String(settled.reason),
        });
        return { deleted: 0, failed: requested };
      }
      if (settled.value.error) {
        logger.warn("deleteCourseStorage: bucket returned error", {
          bucket,
          error: settled.value.error.message,
        });
        return { deleted: 0, failed: requested };
      }
      return { deleted: requested, failed: 0 };
    }

    const resources = tally(
      resourcesSettled,
      COURSE_RESOURCES_BUCKET,
      paths.courseResources.length,
    );
    const submissions = tally(
      submissionsSettled,
      SUBMISSIONS_BUCKET,
      paths.submissions.length,
    );
    const academic = tally(
      academicSettled,
      ACADEMIC_CERTS_BUCKET,
      paths.academicCertificates.length,
    );

    return {
      deleted: {
        courseResources: resources.deleted,
        submissions: submissions.deleted,
        academicCertificates: academic.deleted,
      },
      failed: {
        courseResources: resources.failed,
        submissions: submissions.failed,
        academicCertificates: academic.failed,
      },
    };
  },
};
