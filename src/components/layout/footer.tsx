// Footer reusable entre los layouts (public) y (app). Server
// Component, sin estado.
//
// Bloque 17 §17.1: footer consistente con copyright + 3 links
// legales/soporte. La regla B5 de BOUNDARIES.md fue revisada en
// este bloque: ATLAS NO aparece en el sidebar ni en el footer
// del LMS (productos independientes con audiencias distintas).
//
// El email de contacto se mantiene visible (como antes en el
// header del verify); es la misma direccion que /support
// describe en detalle.

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground lg:px-6">
        <span>© Connected Nutrition Ventures S.A.S.</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href="/privacy"
            className="hover:text-foreground hover:underline"
          >
            Privacidad
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground hover:underline"
          >
            Términos
          </Link>
          <Link
            href="/support"
            className="hover:text-foreground hover:underline"
          >
            Soporte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
