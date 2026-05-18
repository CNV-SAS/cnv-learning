// Dashboard placeholder. En Bloque 5 se reemplaza con el dashboard
// real (progreso, insignia, "continuar donde dejaste" funcional).
//
// Auth check redundante: (app)/layout.tsx ya verifica. Se mantiene
// por explicitidad y para que la pagina siga teniendo el user en
// scope sin pasar por context.

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDisplayName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Hola, {getDisplayName(user)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Te damos la bienvenida a CNV Learning.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Continúa donde dejaste</CardTitle>
          <CardDescription>
            Aún no has comenzado tu primer curso. La vista de progreso
            e insignias estará disponible próximamente.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
