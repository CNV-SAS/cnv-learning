// Panel docente overview. STRICT teacher (refactor Bloque 14.1).
// El admin usa /admin/teachers para inspeccionar paneles de
// docentes especificos.
//
// Render: el componente compartido TeacherPanelOverview hace toda
// la composicion (cards de cursos, stats, roster, CTAs); este
// page solo resuelve auth + invoca con userId = user.id.

import { notFound, redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessTeacherPanel } from "@/modules/auth/policies";
import { TeacherPanelOverview } from "@/modules/teacher-panel/components/teacher-panel-overview";

export default async function TeacherPanelPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessTeacherPanel(user)) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Panel docente
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Tu panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Estado de tus cursos: progreso del cohorte, entregas por
          calificar y atajos a las funciones del día a día.
        </p>
      </div>

      <TeacherPanelOverview
        userId={user.id}
        emptyMessage="Aún no tienes cursos asignados."
      />
    </div>
  );
}
