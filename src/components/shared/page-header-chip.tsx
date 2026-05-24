// PageHeaderChip (Bloque 21.1): chip rol-aware en el top del main
// content. Variant dark para admin ("SYSTEM ADMINISTRATOR"), green
// para teacher ("PORTAL DOCENTE"). Student no usa este chip (el
// layout no lo renderiza).
//
// Integrado a nivel layout en (app)/layout.tsx condicional por
// user.role. Defer la decision de mostrar al caller (el layout
// decide; el componente solo renderiza).

import { cn } from "@/lib/utils";

type Variant = "dark" | "green";

interface PageHeaderChipProps {
  variant: Variant;
  icon: React.ReactNode;
  label: string;
}

const ICON_BG: Record<Variant, string> = {
  dark: "bg-slate-900 text-white",
  green: "bg-emerald-700 text-white",
};

export function PageHeaderChip({
  variant,
  icon,
  label,
}: PageHeaderChipProps) {
  return (
    <div className="mb-6 flex items-center gap-3 lg:mb-8">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          ICON_BG[variant],
        )}
      >
        {icon}
      </div>
      <h2 className="font-display text-lg font-black uppercase tracking-widest">
        {label}
      </h2>
    </div>
  );
}
