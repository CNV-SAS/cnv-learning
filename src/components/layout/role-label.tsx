// RoleLabel (Bloque 21.1): subtitulo "PERFIL X ACTIVO" debajo del
// wordmark del sidebar, con dot verde. Visible siempre, varia el
// label segun rol. Server Component (sin estado).

import type { UserRole } from "@/modules/auth/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Estudiante",
  teacher: "Profesor",
  admin: "Admin",
};

interface RoleLabelProps {
  role: UserRole;
}

export function RoleLabel({ role }: RoleLabelProps) {
  return (
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
      <span
        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        aria-hidden
      />
      Perfil {ROLE_LABEL[role]} activo
    </p>
  );
}
