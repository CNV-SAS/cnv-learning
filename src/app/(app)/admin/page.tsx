// /admin: overview del panel administrativo. Metricas globales en
// cards + grid de CTAs a flujos admin habilitados.
//
// force-dynamic para freshness: las metricas reflejan estado real
// en cada visita (no cacheable: el admin necesita ver counts al
// minuto, no de hace 1 hora).
//
// Metricas (regla 8: privilegiado, admin client predictable):
//   - Usuarios por rol (student / teacher / admin / total).
//   - Certificados emitidos (valid + revoked).
//   - Submissions pendientes (status='submitted', aun sin calificar).
//   - Threads de foro (acumulado).

import Link from "next/link";
import {
  Award,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  MessageSquare,
  Users,
} from "lucide-react";
import { adminMetricsRepository } from "@/modules/admin/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, description, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-black tracking-tight">
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const [userCounts, certCounts, pendingSubmissions, forumThreads] =
    await Promise.all([
      adminMetricsRepository.countUsersByRole(),
      adminMetricsRepository.countCertificates(),
      adminMetricsRepository.countPendingSubmissions(),
      adminMetricsRepository.countForumThreads(),
    ]);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Panel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Estado general de la plataforma y acceso rápido a los flujos
          de gestión.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Usuarios"
          value={userCounts.total.toLocaleString("es")}
          description={`${userCounts.student} estudiantes · ${userCounts.teacher} docentes · ${userCounts.admin} administradores`}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Certificados"
          value={certCounts.valid.toLocaleString("es")}
          description={
            certCounts.revoked > 0
              ? `${certCounts.valid} válidos · ${certCounts.revoked} revocados`
              : "Todos los emitidos están vigentes"
          }
          icon={<Award className="h-4 w-4" />}
        />
        <MetricCard
          label="Entregas pendientes"
          value={pendingSubmissions.toLocaleString("es")}
          description={
            pendingSubmissions === 0
              ? "Sin entregas por calificar"
              : "Entregas en cola para el docente"
          }
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricCard
          label="Hilos del foro"
          value={forumThreads.toLocaleString("es")}
          description={
            forumThreads === 0
              ? "Aún no hay hilos abiertos"
              : "Acumulado de hilos creados"
          }
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Acciones
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/users">
              <Users className="mr-2 h-4 w-4" />
              Usuarios
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/teachers">
              <GraduationCap className="mr-2 h-4 w-4" />
              Docentes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/announce">
              <Globe className="mr-2 h-4 w-4" />
              Nuevo anuncio global
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/certificates">
              <Award className="mr-2 h-4 w-4" />
              Certificados
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/audit">
              <ClipboardList className="mr-2 h-4 w-4" />
              Auditoría
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
