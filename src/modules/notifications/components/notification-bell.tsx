// NotificationBell: icono + badge con conteo de no leidas en el
// header. Server Component que llama a notificationRepository en
// cada render del (app) layout.
//
// Consideracion A del plan del Bloque 10: sin cache agresivo. Next
// App Router es dinamico por default (no se cachea content auth-
// bound), pero el indice parcial notifications_unread_idx hace el
// count O(log n) asi que el cost en cada nav es despreciable.
// Server Actions de markAsRead + markAllAsRead invocan
// revalidatePath('/notifications') que combinado con el auto-refresh
// de Next.js empuja un re-render del layout (que contiene el bell).
//
// Si el user no esta autenticado retorna null (defensive: el (app)
// layout ya redirige a /login en ese caso, pero el bell no debe
// asumir nada).

import Link from "next/link";
import { Bell } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { notificationRepository } from "@/modules/notifications/data";

export async function NotificationBell() {
  const user = await profileRepository.getCurrentUser();
  if (!user) return null;

  const count = await notificationRepository.countUnreadForUser(user.id);
  const hasUnread = count > 0;

  return (
    <Link
      href="/notifications"
      aria-label={
        hasUnread
          ? `${count} notificaciones sin leer`
          : "Notificaciones"
      }
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell className="h-5 w-5" />
      {hasUnread && (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
