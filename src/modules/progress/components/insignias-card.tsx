// InsigniasCard (Bloque 21.6 B2): tarjeta del dashboard student
// que muestra las 3 insignias del MVP (Junior / Senior / Master)
// con la actual coloreada y las demas en gris. Server Component.
//
// Reusa BadgeDisplay variant="card" del 21.2 y sobreescribe el
// colorClass para las inactivas (sin necesidad de un prop nuevo
// "dimmed": pasamos un Badge clon con colorClass muted).

import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BadgeDisplay } from "./badge-display";
import { ALL_BADGES, type Badge } from "@/modules/progress/lib";

interface InsigniasCardProps {
  currentBadgeId: Badge["id"];
}

const DIMMED_COLOR = "bg-muted text-muted-foreground border-transparent";

export function InsigniasCard({ currentBadgeId }: InsigniasCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h2 className="font-display text-base font-bold tracking-tight">
            Insignias
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {ALL_BADGES.map((badge) => {
            const isActive = badge.id === currentBadgeId;
            const display = isActive
              ? badge
              : { ...badge, colorClass: DIMMED_COLOR };
            return (
              <BadgeDisplay
                key={badge.id}
                badge={display}
                size="card"
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Completa lecciones para subir de rango: Junior (0-49%),
          Senior (50-84%), Master (85-100%).
        </p>
      </CardContent>
    </Card>
  );
}
