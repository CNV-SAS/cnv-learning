// Logger del proyecto. JSON structured a stdout/stderr + Sentry en errores
// (ARCHITECTURE.md 413-424).
//
// Convencion: TODO log incluye automaticamente el LogContext activo
// (requestId, userId) inyectado por withContext en context.ts. Esto hace
// trivial agrupar logs de una sola request en busquedas de Vercel/Sentry.
//
// 3 niveles:
// - info: eventos normales (login exitoso, mutacion OK, etc.).
// - warn: situaciones anomalas que no son errores (rate limit hit,
//   reintento, fallback aplicado).
// - error: fallos. Ademas de loguear, dispara Sentry.captureMessage con
//   tags=requestId/userId y extras=meta para investigacion post-incidente.
//
// IMPORTANTE: este logger es Node.js only (depende de AsyncLocalStorage
// via context.ts). El middleware (Edge runtime) NO puede importarlo.

import * as Sentry from "@sentry/nextjs";
import { getContext } from "./context";

type Meta = Record<string, unknown>;
type Level = "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Meta): void {
  const ctx = getContext();
  const payload = {
    level,
    msg,
    ...ctx,
    ...meta,
    ts: new Date().toISOString(),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(msg: string, meta?: Meta): void {
    emit("info", msg, meta);
  },

  warn(msg: string, meta?: Meta): void {
    emit("warn", msg, meta);
  },

  error(msg: string, meta?: Meta): void {
    emit("error", msg, meta);
    const ctx = getContext();
    Sentry.captureMessage(msg, {
      tags: { requestId: ctx?.requestId, userId: ctx?.userId },
      extra: meta,
    });
  },
};
