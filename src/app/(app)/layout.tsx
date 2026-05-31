// Layout del grupo (app): rutas protegidas (dashboard, learn, teacher,
// admin, etc.). En Bloque 3 sub-bloque 3.4 compone el shell completo:
// sidebar fijo desktop + Sheet mobile + header con avatar.
//
// Auth check: defensa en profundidad. El proxy ya redirige a /login
// si no hay sesion, pero verificamos aqui tambien por race conditions
// y cache stale (el user prop se pasa a UserDropdown, no tolera null).
//
// Items del sidebar vienen filtrados por la policy getNavigationFor
// (regla dura 3 de ARCHITECTURE.md).
//
// Bloque 17 §17.1: Footer compartido al final del area scrolleable.
// Mismo componente que (public)/layout para consistencia visual y
// para que los links a /privacy /terms /support sean accesibles
// desde cualquier ruta autenticada.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, Settings } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { getNavigationFor } from "@/modules/auth/policies/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { Wordmark } from "@/components/shared/wordmark";
import { PageHeaderChip } from "@/components/shared/page-header-chip";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { getDisplayName, getInitials } from "@/lib/utils/format";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const items = getNavigationFor(user);
  const displayName = getDisplayName(user);
  const initials = getInitials(user.full_name, user.email);

  // PageHeaderChip rol-aware (Bloque 21.1): solo se renderiza para
  // teacher y admin. Student no usa chip (su dashboard tiene HeroCard
  // verde propio). El chip va dentro del main, encima del contenido
  // de cada page; B18 footer queda intacto al final.
  const headerChip =
    user.role === "admin" ? (
      <PageHeaderChip
        variant="dark"
        icon={<Settings className="h-5 w-5" />}
        label="System Administrator"
      />
    ) : user.role === "teacher" ? (
      <PageHeaderChip
        variant="green"
        icon={<Layers className="h-5 w-5" />}
        label="Portal Docente"
      />
    ) : null;

  return (
    // Smoke E2E round 3 BUG 3: usamos fixed inset-0 (en lugar de
    // h-screen) para sacar el shell del flujo del body. Body queda
    // sin children flex y mantiene su min-h-full = 100vh sin posibilidad
    // de crecer, eliminando el doble scrollbar que aparecia cuando
    // contenido + paddings residuales empujaban body por encima del
    // viewport. (auth) y (public) layouts NO usan este wrapper,
    // mantienen su scroll natural en pages largas (/privacy, /terms).
    <div className="fixed inset-0 flex">
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-border bg-background">
        <Sidebar items={items} role={user.role} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          leftSlot={
            <>
              <MobileNav>
                <Sidebar items={items} role={user.role} />
              </MobileNav>
              {/* 22.1 A: logo movil clickeable a /dashboard (paridad
               * con el logo desktop del sidebar, smoke B21 fix). */}
              <Link
                href="/dashboard"
                className="lg:hidden"
                aria-label="Ir al dashboard"
              >
                <Wordmark />
              </Link>
            </>
          }
          rightSlot={
            <>
              <NotificationBell />
              {/* UserDropdown visible en todas las anchuras (21.6
               * revert): el SidebarLogoutButton se removio del
               * sidebar por contraste agresivo; el logout vuelve al
               * dropdown del header como en MVP original. */}
              <UserDropdown
                displayName={displayName}
                email={user.email}
                initials={initials}
                avatarUrl={user.avatar_url}
              />
            </>
          }
        />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 p-6 lg:p-10">
            {headerChip}
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
