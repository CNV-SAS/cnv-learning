// Lista de notificaciones del user autenticado. Server Component.
// El bell del header linkea aqui; cada item del listado marca como
// leida + navega al link de la notification cuando se hace click.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { notificationRepository } from "@/modules/notifications/data";
import { NotificationList } from "@/modules/notifications/components/notification-list";
import { MarkAllAsReadButton } from "@/modules/notifications/components/mark-all-as-read-button";

export default async function NotificationsPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await notificationRepository.listForUser(user.id);
  const hasUnread = notifications.some((n) => n.read_at === null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Mensajes y avisos de tu actividad en CNV Learning.
          </p>
        </div>
        {hasUnread && <MarkAllAsReadButton />}
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}
