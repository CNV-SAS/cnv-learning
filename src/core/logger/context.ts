// Contexto por request via AsyncLocalStorage (ARCHITECTURE.md 401-411).
//
// Cada server action y route handler inicializa el contexto al entrar
// con withContext({ requestId, userId? }, fn). El logger lee el contexto
// activo y lo inyecta en cada log line, dando trazabilidad cross-async sin
// pasar requestId manualmente por cada llamada.
//
// IMPORTANTE: AsyncLocalStorage solo funciona en Node.js runtime, NO en
// Edge runtime. El middleware (Edge) NO puede usar este modulo. Si el
// middleware necesita loguear, usa console.log directo sin context.

import { AsyncLocalStorage } from "async_hooks";

export type LogContext = {
  requestId: string;
  userId?: string;
};

const storage = new AsyncLocalStorage<LogContext>();

export function withContext<T>(ctx: LogContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): LogContext | undefined {
  return storage.getStore();
}
