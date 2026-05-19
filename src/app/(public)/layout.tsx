// Layout del grupo (public): rutas accesibles sin sesion. Hoy
// alberga solo /verify/[id]; en bloques futuros agregara /privacy,
// /terms, /support (ARCHITECTURE.md estructura de carpetas).
//
// Shell minimal sin sidebar, sin UserDropdown, sin bell. Wordmark
// CNV Learning en el header + footer simple con copyright/contacto.
//
// Sin auth check aqui: el proxy ya deja pasar las rutas listadas
// en PUBLIC_PATHS (src/proxy.ts). Renderizar este layout para un
// usuario autenticado o anonimo es indiferente; la pagina decide
// que mostrar.

import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4 lg:px-6">
          <Link
            href="/"
            className="flex items-center gap-1 font-display text-base font-black tracking-tight"
          >
            <span className="text-emerald-700">CNV</span>
            <span className="text-foreground">LEARNING</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-10 lg:px-6 lg:py-14">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground lg:px-6">
          <span>© Connected Nutrition Ventures SAS</span>
          <a
            href="mailto:soporte@cnvsystem.com"
            className="underline hover:text-foreground"
          >
            soporte@cnvsystem.com
          </a>
        </div>
      </footer>
    </div>
  );
}
