// Form para emitir anuncio scope='global'. Server Component que
// valida admin via canAccessAdmin policy. Sin curso (es a toda la
// plataforma); el AnnouncementForm con scope='global' renderiza solo
// title + body.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { AnnouncementForm } from "@/modules/announcements/components/announcement-form";
import { Button } from "@/components/ui/button";

export default async function AdminAnnouncePage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-black tracking-tight">
          Nuevo anuncio global
        </h1>
        <p className="text-sm text-muted-foreground">
          Llega a todos los usuarios autenticados de CNV Learning por la
          página de notificaciones y por email.
        </p>
      </div>
      <AnnouncementForm scope="global" />
    </div>
  );
}
