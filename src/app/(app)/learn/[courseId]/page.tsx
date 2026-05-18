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
import {
  courseRepository,
  moduleRepository,
  lessonRepository,
} from "@/modules/courses/data";
import { canViewCourse } from "@/modules/courses/policies";
import { ModuleList } from "@/modules/courses/components/module-list";

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const course = await courseRepository.findById(courseId);
  if (!canViewCourse(user, { courseExists: course !== null }) || !course) {
    notFound();
  }

  const modules = await moduleRepository.listByCourse(courseId);
  const modulesWithLessons = await Promise.all(
    modules.map(async (mod) => ({
      module: mod,
      lessons: await lessonRepository.listByModule(mod.id),
    })),
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
      <ModuleList courseId={courseId} modules={modulesWithLessons} />
    </div>
  );
}
