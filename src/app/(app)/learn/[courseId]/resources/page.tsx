// Vista student de recursos del curso (Bloque 20.3). Lista los
// recursos del curso agrupados por scope (General arriba, por modulo
// abajo). Read-only: solo descargas (signed URLs para files) o
// "abrir enlace" para links externos.
//
// Auth: canViewCourse (B4). RLS de migracion 0030 garantiza que solo
// enrolled students + teachers + admins acceden. Defense in depth a
// nivel app + RLS.
//
// Lesson attachments NO se duplican aqui: siguen apareciendo dentro
// de cada lesson page del student (componente AttachmentList).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  courseRepository,
  courseResourceRepository,
  moduleRepository,
} from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { courseResourceService } from "@/modules/courses/services/course-resource.service";
import { StudentResourceCard } from "@/modules/courses/components/student-resource-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";
import type { CourseResource } from "@/modules/courses/types";

interface ResourcesPageProps {
  params: Promise<{ courseId: string }>;
}

// Pre-resuelve signed URLs en paralelo para todos los files de un
// grupo. Devuelve un Map resource.id -> signedUrl|null que el render
// consulta. Para links retorna null (no se usa).
async function buildSignedUrlMap(
  resources: CourseResource[],
): Promise<Map<string, string | null>> {
  const fileResources = resources.filter(
    (r) => r.kind === "file" && r.storage_path !== null,
  );
  const entries = await Promise.all(
    fileResources.map(async (r) => {
      const url = await courseResourceRepository.getSignedUrl(
        r.storage_path as string,
      );
      return [r.id, url] as const;
    }),
  );
  return new Map(entries);
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const [grouped, modules] = await Promise.all([
    courseResourceService.listByCourseGrouped(courseId),
    moduleRepository.listByCourse(courseId),
  ]);

  // Si el curso no tiene NINGUN recurso, el link "Recursos" no se
  // muestra en /learn/[courseId] (decision A4 del planning). El user
  // podria llegar aqui via URL directa: render empty-state.
  const hasAny =
    grouped.general.length > 0 ||
    Array.from(grouped.byModule.values()).some((rs) => rs.length > 0);

  // Signed URLs pre-resueltas en paralelo para todos los archivos
  // del curso (general + per-modulo). Una sola Promise.all.
  const allFiles = [
    ...grouped.general,
    ...Array.from(grouped.byModule.values()).flat(),
  ];
  const signedUrls = await buildSignedUrlMap(allFiles);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/learn/${courseId}`}>
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Volver al curso
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Recursos del curso
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {course.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Material descargable y enlaces externos del curso. Los archivos
          se descargan con un enlace temporal válido por 15 minutos.
        </p>
      </div>

      {!hasAny ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Este curso aún no tiene recursos publicados.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* General del curso */}
          {grouped.general.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold tracking-tight">
                General del curso
              </h2>
              <ul className="space-y-3">
                {grouped.general.map((resource) => (
                  <li key={resource.id}>
                    <StudentResourceCard
                      resource={resource}
                      signedUrl={signedUrls.get(resource.id) ?? null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Por modulo (solo modulos con recursos) */}
          {modules
            .filter((m) => (grouped.byModule.get(m.id) ?? []).length > 0)
            .map((module) => {
              const moduleResources = grouped.byModule.get(module.id) ?? [];
              return (
                <section key={module.id} className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Módulo {module.position}
                    </p>
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      {module.title}
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {moduleResources.map((resource) => (
                      <li key={resource.id}>
                        <StudentResourceCard
                          resource={resource}
                          signedUrl={signedUrls.get(resource.id) ?? null}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </>
      )}
    </div>
  );
}
