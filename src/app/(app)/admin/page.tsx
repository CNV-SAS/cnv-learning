// Placeholder del panel admin. Vista completa en Bloque 14 (gestion de
// usuarios, stats, auditoria). Por ahora ofrece un CTA al unico flujo
// admin habilitado: emision de anuncios globales (Bloque 10).

import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Panel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Vista completa en Bloque 14 (gestión de usuarios, métricas,
          auditoría). Por ahora, las acciones disponibles son:
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin/announce">
            <Globe className="mr-2 h-4 w-4" />
            Nuevo anuncio global
          </Link>
        </Button>
      </div>
    </div>
  );
}
