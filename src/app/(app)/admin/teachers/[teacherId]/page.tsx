// /admin/teachers/[teacherId]: vista admin del panel del docente
// especificado. Reusa TeacherPanelOverview (Server Component
// async) pasando teacherId desde la URL. Refactor del Bloque 14.1.
//
// Guards:
//   - requireUuidParam(teacherId) → 404 si malformado.
//   - canAccessAdmin → solo admin.
//   - profile resuelto debe tener role='teacher' → 404 si no.
//     Defensa contra teacherId que apunta a otro rol (student/admin).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { TeacherPanelOverview } from "@/modules/teacher-panel/components/teacher-panel-overview";
import { Button } from "@/components/ui/button";
import { requireUuidParam } from "@/lib/utils/params";

interface AdminTeacherPanelPageProps {
  params: Promise<{ teacherId: string }>;
}

export default async function AdminTeacherPanelPage({
  params,
}: AdminTeacherPanelPageProps) {
  const { teacherId: rawTeacherId } = await params;
  const teacherId = requireUuidParam(rawTeacherId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const teacherProfile = await profileRepository.findById(teacherId);
  if (!teacherProfile || teacherProfile.role !== "teacher") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin/teachers">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a docentes
          </Link>
        </Button>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Panel de {teacherProfile.full_name}
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Cursos del docente
        </h1>
        <p className="text-sm text-muted-foreground">
          Estás viendo el panel de {teacherProfile.full_name} (
          {teacherProfile.email}). Las acciones disponibles aquí
          (anuncio, calificar, ver detalle de alumno) las ejecutas tú
          como administrador.
        </p>
      </div>

      <TeacherPanelOverview
        userId={teacherProfile.id}
        emptyMessage={`${teacherProfile.full_name} aún no tiene cursos asignados.`}
      />
    </div>
  );
}
