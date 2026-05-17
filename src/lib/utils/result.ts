// Result<T, E> es la convencion del proyecto para retornar errores esperables
// sin throw (ARCHITECTURE.md linea 510-515).
//
// Server actions, services y repositorios retornan Result<T, AppError>.
// El caller hace un destructure por `ok`:
//
//   const r = await loginAction(input);
//   if (!r.ok) return showError(r.error);
//   const user = r.value;
//
// Esto evita try/catch repetitivo en componentes cliente y deja explicito
// el flujo de error en la signature de cada funcion.
//
// throw queda reservado para casos excepcionales (bug, infraestructura
// caida) que se propagan hasta Sentry via error.tsx o handlers globales.

import type { AppError } from "@/core/errors/classes";

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

// Helper genérico para construir Result.failure. Acepta AppError (uso
// interno de services/repos) o ActionError plain (frontera server action
// -> client). Sin constraint para que ambos casos compilen.
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
