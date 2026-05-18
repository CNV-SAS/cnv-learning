// Vista del curso (Bloque 4 sub-bloque 4.3). Server Component async:
// resuelve params -> fetch user -> fetch course con policy
// canViewCourse (RLS hace el filtrado real, la policy documenta la
// intencion); 404 si no es accesible. Luego fetch modulos + lessons
// por modulo en paralelo (Promise.all sobre listByModule).
//
// La pagina es read-only en Bloque 4. Marcar leccion completada y
// nav prev/next entran en la lesson view (sub-bloque 4.4 y 4.5).

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { courseRepository } from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { progressService } from "@/modules/progress/services/progress.service";
import { ModuleList } from "@/modules/courses/components/module-list";
import { requireUuidParam } from "@/lib/utils/params";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const courseId = requireUuidParam((await params).courseId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  // Bloque 5 sub-bloque 5.3: delega a progressService que orquesta
  // modules + lessons + completed en paralelo. Reemplaza el
  // fetch manual previo (Bloque 4.3) que ahora vive en el service.
  const modulesWithProgress = await progressService.getModulesWithProgress(
    user.id,
    courseId,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-black tracking-tight">
          {course.title}
        </h1>
        {course.description && (
          <p className="text-sm text-muted-foreground">
            {course.description}
          </p>
        )}
      </div>
      <ModuleList courseId={courseId} modules={modulesWithProgress} />
    </div>
  );
}
