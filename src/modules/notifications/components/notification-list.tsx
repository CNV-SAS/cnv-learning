// NotificationList: render plano de notifications. Server Component.
// EmptyState cuando no hay ninguna.

import { Bell } from "lucide-react";
import { NotificationItem } from "./notification-item";
import type { Notification } from "../types";

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bell className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">
          Aún no tienes notificaciones.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
    </div>
  );
}
