"use client";

// MobileNav: trigger hamburguesa + Sheet con el sidebar dentro,
// visible solo en mobile (<lg). Es Client porque maneja el estado
// open/close del Sheet.
//
// Recibe el contenido del sidebar como children (server-rendered)
// para mantener el patron oficial Next.js de "server component
// passed as child to client component". Asi el Sidebar Server NO
// se re-renderiza en cliente al abrir/cerrar el sheet.
//
// Sin persistencia de estado (cookies/localStorage): se cierra al
// navegar (default de Radix Dialog + onOpenChange). Polish para
// Bloque 18.

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        {/* SheetTitle + SheetDescription requeridos por Radix Dialog
            para a11y. Wordmark del sidebar ya cumple rol visual, asi
            que estos viven solo para screen readers (sr-only). */}
        <SheetTitle className="sr-only">Navegación</SheetTitle>
        <SheetDescription className="sr-only">
          Menú principal de CNV Learning
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
