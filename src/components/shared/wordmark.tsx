import { cn } from "@/lib/utils";

// Wordmark text-only de CNV Learning. Placeholder hasta que llegue el
// logo SVG oficial del director (entonces se reemplaza
// public/brand/logo.svg y se actualiza este componente para usar Image).
// Split visual segun BRAND.md linea 243: "CNV" en emerald-700 con
// font-display peso 900, "Learning" en text-foreground.
//
// Variants previstos por uso (sin refactor futuro):
// - sm: header mobile compacto, email footer Bloque 10.
// - default: sidebar desktop, header mobile expandido.
// - lg: not-found, login page, paginas de marca prominente.

type WordmarkVariant = "sm" | "default" | "lg";

const SIZES: Record<WordmarkVariant, string> = {
  sm: "text-base",
  default: "text-xl",
  lg: "text-3xl",
};

interface WordmarkProps {
  variant?: WordmarkVariant;
  className?: string;
}

export function Wordmark({ variant = "default", className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-display font-black tracking-tight",
        SIZES[variant],
        className,
      )}
      aria-label="CNV Learning"
    >
      <span className="text-emerald-700">CNV</span>
      <span className="text-foreground">Learning</span>
    </span>
  );
}
