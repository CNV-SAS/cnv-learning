"use client";

// Sub-componente reusable: Input de password con toggle de visibilidad
// (icono ojo abierto/cerrado). Usado por LoginForm y ResetPasswordForm.
//
// Notas tecnicas:
// - forwardRef porque react-hook-form pasa ref al control input para
//   registrarlo.
// - type="button" explicito en el toggle para evitar que su click
//   dispare submit del form (default de <button> dentro de <form>).
// - tabIndex={-1} en el toggle: el user al tabular va de un input al
//   siguiente sin colarse el toggle (mejor UX con teclado).
// - aria-label dinamico para lectores de pantalla.
// - pr-10 en el Input reserva espacio para el boton sin overlap.

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={show ? "text" : "password"}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
});
