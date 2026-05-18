// ProgressBar: wrapper Server de shadcn Progress con label y
// porcentaje opcionales. El indicator usa --primary (emerald-600
// con el override del Bloque 3) por default; no hace falta tunear
// el color aqui.
//
// Variants previstos:
// - default: dashboard CourseCard, paginas con espacio holgado.
// - sm: acordeon de modulos en course view, indicador compacto.
//
// label y showPercentage son independientes; el caller decide la
// combinacion segun densidad de info (ej: dashboard usa ambos,
// modulos solo label).

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  size?: "default" | "sm";
  className?: string;
}

export function ProgressBar({
  percentage,
  label,
  showPercentage = false,
  size = "default",
  className,
}: ProgressBarProps) {
  const hasHeader = label || showPercentage;
  const heightClass = size === "sm" ? "h-1" : "h-2";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {hasHeader && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showPercentage && (
            <span className="font-semibold text-foreground">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <Progress value={percentage} className={heightClass} />
    </div>
  );
}
