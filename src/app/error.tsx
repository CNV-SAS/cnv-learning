"use client";

// Error boundary del root segment. Captura cualquier error runtime
// no manejado en segments hijos (incluido (app) y (auth)), reporta
// a Sentry y muestra UI friendly con boton de reintentar.
//
// NO reemplaza global-error.tsx (creado por Sentry wizard), que
// cubre crashes del root layout en si mismo (renderiza con su
// propio <html> y <body>).

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark variant="lg" />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Algo salió mal
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado. Nuestro equipo fue notificado
          automáticamente. Puedes intentar de nuevo en un momento.
        </p>
      </div>
      <Button onClick={reset} size="lg" className="px-8">
        Reintentar
      </Button>
    </div>
  );
}
