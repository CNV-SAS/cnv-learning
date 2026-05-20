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

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { getNavigationFor } from "@/modules/auth/policies/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { Wordmark } from "@/components/shared/wordmark";
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

  return (
    <div className="flex h-screen">
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-border bg-background">
        <Sidebar items={items} />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          leftSlot={
            <>
              <MobileNav>
                <Sidebar items={items} />
              </MobileNav>
              <Wordmark className="lg:hidden" />
            </>
          }
          rightSlot={
            <>
              <NotificationBell />
              <UserDropdown
                displayName={displayName}
                email={user.email}
                initials={initials}
                avatarUrl={user.avatar_url}
              />
            </>
          }
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
