"use client";

// Sub-componente reusable: Input de password con toggle de visibilidad
// (icono ojo abierto/cerrado). Usado por LoginForm, ResetPasswordForm
// y ChangePasswordDialog.
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
//
// Bug del toggle (S1.1, fix definitivo tras intento fallido en pre-18):
// El click sobre el area del ojo a veces no disparaba el toggle. Tres
// causas concurrentes:
//   1. pointer-events-none en el <svg> de lucide-react no se propaga
//      de forma fiable a los <path>/<circle> internos. Si el click
//      caia exactamente sobre la linea pintada del ojo, el target era
//      el <path>, no el button, y el handler no se ejecutaba.
//   2. El Button shadcn aplica active:translate-y-px que mueve el
//      boton 1px hacia abajo en mouseDown. Si el click iba cerca del
//      borde superior, el mouseup caia fuera del area del button y
//      el evento click nunca se dispara. Esto explica el sintoma de
//      "solo funciona en borde inferior".
//   3. preventDefault en mouseDown evitaba el cambio de focus pero
//      en algunos browsers, combinado con (1), perdia el click bubble.
//
// Fix multinivel:
//   - <button> HTML plano (no shadcn Button) para tener control
//     directo del cva.
//   - Toggle en onMouseDown con preventDefault: el toggle ocurre
//     antes del focus change y no depende del bubble del click. Esto
//     tambien hace seguro mantener el active:translate-y-px (press
//     feedback de 1px hacia abajo): en el original ese translate
//     desplazaba el mouseup fuera del area del button y perdia el
//     click; ahora el toggle ya fue ejecutado en mouseDown antes
//     de que el active state se aplique.
//   - <span className="pointer-events-none"> wrapper sobre el icono:
//     un span HTML propaga pointer-events: none a TODOS sus
//     descendientes (incluyendo path, circle internos del SVG), de
//     forma fiable. Asi cualquier click dentro del button llega al
//     handler sin importar donde dentro del icono caiga.

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

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
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
        onMouseDown={(e) => {
          e.preventDefault();
          setShow((v) => !v);
        }}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        <span className="pointer-events-none flex items-center justify-center">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </span>
      </button>
    </div>
  );
});
