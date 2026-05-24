// IconLinkCard (Bloque 21.1): card con icono emerald + titulo +
// link wrapper. Usado en el grid 2x2 de "Comunidad" (foros). Server
// Component. Hover sutil (shadow + border) sin levantar el card.

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface IconLinkCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href: string;
}

export function IconLinkCard({
  icon,
  title,
  description,
  href,
}: IconLinkCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            {icon}
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-bold tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
