// Layout del grupo (public): rutas accesibles sin sesion. Alberga
// /verify/[id] (Bloque 12) y /privacy, /terms, /support (Bloque 17).
//
// Shell minimal sin sidebar, sin UserDropdown, sin bell. Wordmark
// CNV Learning en el header + Footer compartido (Bloque 17) con
// links a /privacy, /terms, /support.
//
// Sin auth check aqui: el proxy ya deja pasar las rutas listadas
// en PUBLIC_PATHS (src/proxy.ts). Renderizar este layout para un
// usuario autenticado o anonimo es indiferente; la pagina decide
// que mostrar.

import Link from "next/link";
import { Footer } from "@/components/layout/footer";

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
      <Footer />
    </div>
  );
}
