// /admin/users: lista de usuarios del sistema con rol, estado y
// CTA "Ver detalle". Header con boton "Nuevo usuario" (Dialog).
//
// Admin-only via layout. listAll trae profiles ordenados por nombre;
// resolveSuspensionMap los cruza con auth.users.banned_until para
// el badge de estado. Para MVP <50 users es 1 query + 1 listUsers
// page=1000.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";
import { adminUserRepository } from "@/modules/admin/data";
import { CreateUserDialog } from "@/modules/admin/components/create-user-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function roleLabel(role: "student" | "teacher" | "admin"): string {
  if (role === "admin") return "Administrador";
  if (role === "teacher") return "Docente";
  return "Estudiante";
}

function roleVariant(role: "student" | "teacher" | "admin"):
  | "default"
  | "secondary"
  | "outline" {
  if (role === "admin") return "default";
  if (role === "teacher") return "secondary";
  return "outline";
}

export default async function AdminUsersPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) notFound();

  const profiles = await adminUserRepository.listAll();
  const suspensionMap = await adminUserRepository.resolveSuspensionMap(
    profiles.map((p) => p.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight">
              Usuarios
            </h1>
            <p className="text-sm text-muted-foreground">
              Listado completo de usuarios del sistema. Crea, edita,
              suspende o elimina cuentas. Las acciones críticas se
              registran en auditoría.
            </p>
          </div>
          <CreateUserDialog />
        </div>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Aún no hay usuarios registrados en el sistema.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((profile) => {
                const isSuspended = suspensionMap.get(profile.id) ?? false;
                return (
                  <tr key={profile.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{profile.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {profile.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant={roleVariant(profile.role)}>
                        {roleLabel(profile.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
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
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${profile.id}`}>
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Ver detalle
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
