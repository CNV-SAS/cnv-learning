// /admin/users/[userId]: detalle de un usuario con cards de gestion.
// 4 cards: cambiar rol, reseteo password, suspension, zona destructiva
// (eliminar). El service maneja todos los guards (anti-self,
// anti-lockout, isLastAdmin) en cada accion.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, ShieldCheck, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { adminUserRepository } from "@/modules/admin/data";
import { UpdateRoleForm } from "@/modules/admin/components/update-role-form";
import { SuspendUserDialog } from "@/modules/admin/components/suspend-user-dialog";
import { UnsuspendUserButton } from "@/modules/admin/components/unsuspend-user-button";
import { SendPasswordResetButton } from "@/modules/admin/components/send-password-reset-button";
import { DeleteUserDialog } from "@/modules/admin/components/delete-user-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function roleLabel(role: "student" | "teacher" | "admin"): string {
  if (role === "admin") return "Administrador";
  if (role === "teacher") return "Docente";
  return "Estudiante";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const actor = await profileRepository.getCurrentUser();
  if (!actor) redirect("/login");
  if (!canAccessAdmin(actor)) notFound();

  const target = await adminUserRepository.findProfileById(userId);
  if (!target) notFound();

  const isSelf = target.id === actor.id;
  const isSuspended = await adminUserRepository.isUserSuspended(target.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 text-muted-foreground"
        >
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a usuarios
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              {target.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">{target.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{roleLabel(target.role)}</Badge>
            {isSuspended ? (
              <Badge
                variant="secondary"
                className="bg-rose-100 text-rose-700"
              >
                <ShieldOff className="mr-1 h-3 w-3" />
                Suspendido
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                Activo
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Registrado el{" "}
          {format(new Date(target.created_at), "d MMM y", { locale: es })}
        </p>
      </div>

      {isSelf && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            Estás viendo tu propio perfil. Las acciones de cambio de rol,
            suspensión y eliminación están deshabilitadas para evitar
            lockout accidental.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inscripciones</CardTitle>
          <CardDescription>
            Asigna cursos al usuario o cancela inscripciones existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/admin/users/${target.id}/enrollments`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Gestionar inscripciones
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rol</CardTitle>
          <CardDescription>
            Cambiar el rol modifica los permisos del usuario en toda la
            plataforma. No puedes cambiar tu propio rol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateRoleForm
            userId={target.id}
            currentRole={target.role}
            disabled={isSelf}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reseteo de contraseña</CardTitle>
          <CardDescription>
            Envía al usuario un email con un enlace para configurar una
            nueva contraseña. El enlace es válido por 1 hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SendPasswordResetButton userId={target.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suspensión</CardTitle>
          <CardDescription>
            Un usuario suspendido no puede iniciar sesión. La suspensión
            es reversible. No puedes suspenderte a ti mismo ni al último
            administrador del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              No puedes suspender tu propia cuenta.
            </p>
          ) : isSuspended ? (
            <UnsuspendUserButton userId={target.id} />
          ) : (
            <SuspendUserDialog
              userId={target.id}
              userName={target.full_name}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base text-rose-700">
            Zona destructiva
          </CardTitle>
          <CardDescription>
            Eliminar borra permanentemente la cuenta y sus datos
            relacionados. Los registros de auditoría se preservan con el
            actor anonimizado. No puedes eliminarte a ti mismo ni al
            último administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              No puedes eliminar tu propia cuenta.
            </p>
          ) : (
            <DeleteUserDialog
              userId={target.id}
              userEmail={target.email}
              userName={target.full_name}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
