"use client";

// NotificationItem: card de una notification individual. Client
// Component porque necesita onClick para combinar "mark as read"
// (server action) + navegacion al link (router.push).
//
// Comportamiento:
//   - Si la notification es no leida y tiene link: marca como
//     leida + navega.
//   - Si es no leida sin link: solo marca como leida.
//   - Si ya leida con link: navega.
//   - Si ya leida sin link: noop (no es clickable; cursor default).
//
// Visual: emerald accent en la columna izquierda si no leida;
// muted si leida. Icono por kind para reconocimiento rapido.

import {
  Award,
  Bell,
  CheckCircle,
  Globe,
  Megaphone,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { markAsReadAction } from "@/modules/notifications/server";
import type { Notification, NotificationKind } from "../types";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  graded: CheckCircle,
  announcement_course: Megaphone,
  announcement_global: Globe,
  certificate_issued: Award,
  certificate_revoked: XCircle,
  submission_received: Bell,
};

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const Icon = KIND_ICON[notification.kind];
  const isUnread = notification.read_at === null;
  const clickable = isUnread || notification.link !== null;

  function handleClick() {
    if (!clickable || isPending) return;

    if (isUnread) {
      startTransition(async () => {
        await markAsReadAction({ notificationId: notification.id });
        if (notification.link) {
          router.push(notification.link);
        }
      });
    } else if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable || isPending}
      className={`w-full rounded-2xl border p-4 text-left transition-colors disabled:cursor-default ${
        isUnread
          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
          : "border-border bg-card hover:bg-muted/40"
      } ${clickable && !isPending ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isUnread
              ? "bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p
              className={
                isUnread ? "font-semibold" : "font-medium text-muted-foreground"
              }
            >
              {notification.title}
            </p>
            {isUnread && (
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-600"
              />
            )}
          </div>
          {notification.body && (
            <p className="text-sm text-muted-foreground">
              {notification.body}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            hace{" "}
            {formatDistanceToNow(new Date(notification.created_at), {
              locale: es,
            })}
          </p>
        </div>
      </div>
    </button>
  );
}
