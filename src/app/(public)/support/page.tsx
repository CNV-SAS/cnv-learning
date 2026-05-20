// /support: pagina publica de contacto. Email visible + descripcion
// de que incluir en el mensaje + canal de emergencia.
//
// Sin form de contacto en MVP (decision G del plan B17). Si en
// cohorte real se requiere, agregar en v1.1.

import { LifeBuoy, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Soporte · CNV Learning",
  description:
    "Soporte técnico y académico de la plataforma CNV Learning.",
};

export default function SupportPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 font-display text-3xl font-black tracking-tight">
          <LifeBuoy className="h-7 w-7 text-emerald-700" />
          Soporte técnico y académico
        </h1>
        <p className="text-sm text-muted-foreground">
          ¿Tienes preguntas sobre la plataforma, problemas de acceso o
          dudas sobre el contenido del programa?
        </p>
      </header>

      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="space-y-3 py-6">
          <p className="text-sm font-medium text-foreground">
            Escríbenos a:
          </p>
          <a
            href="mailto:soporte@cnvsystem.com"
            className="inline-block font-display text-xl font-bold tracking-tight text-emerald-700 underline-offset-4 hover:underline"
          >
            soporte@cnvsystem.com
          </a>
          <p className="text-xs text-muted-foreground">
            Tiempo de respuesta habitual: 1 a 2 días hábiles.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Qué incluir en el mensaje
        </h2>
        <p className="text-sm leading-relaxed">
          Para que podamos ayudarte más rápido, incluye en el correo:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>Tu nombre completo y el correo registrado en la plataforma.</li>
          <li>Una descripción clara del problema o consulta.</li>
          <li>
            Capturas de pantalla si aplica (especialmente para problemas
            técnicos).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Phone className="h-5 w-5 text-rose-700" />
          Emergencias o asuntos urgentes
        </h2>
        <p className="text-sm leading-relaxed">
          Si tu solicitud es urgente y no puede esperar el tiempo
          habitual de respuesta por correo, puedes escribir o llamar a:
        </p>
        <p className="font-display text-xl font-bold tracking-tight text-foreground">
          <a
            href="tel:+573008083210"
            className="hover:underline"
          >
            +57 300 808 3210
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Reserva este canal para emergencias reales; para consultas
          comunes prefiere el correo.
        </p>
      </section>
    </article>
  );
}
