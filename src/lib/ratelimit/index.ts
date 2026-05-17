// Rate limiters basados en Upstash (sliding window) para los endpoints
// del MVP que pueden ser abusados por bots o ataques de fuerza bruta.
//
// Asimetria intencional por costo del recurso (ajuste sub-bloque 2.16):
// - login: 10/5min por IP. Operacion cotidiana; bloqueo de 15min era
//   brutal para humanos que olvidan password ocasionalmente. Ventana
//   corta (5min) + cuota generosa (10) cubre typos sin frustrar UX.
//   120 intentos/hora sigue siendo trivialmente bajo para anti
//   brute-force real (atacante necesita 100M+ intentos para password
//   promedio).
// - forgotPassword: 5/15min por IP. Operacion extraordinaria que cuesta
//   un email (Resend Free permite ~100 emails/dia para todo el equipo).
//   Ventana mas larga tiene sentido de costo. Heads-up: si en produccion
//   aparece abuso, considerar 3/15min o 5/30min.
// - ai: 20/1h por user (Gemini cuesta plata por token).
// - forum: 30/1h por user (anti spam de posts).
// - mutation: 100/1min por user (default para cualquier otra mutacion).
//
// El identificador (IP vs userId) se decide en el call site, no aqui.
// Endpoints sin sesion usan IP; endpoints con sesion usan userId.
//
// upload (50/1h por user) se agregara en Bloque 6 cuando exista el flujo
// de uploads.
//
// Redis.fromEnv() lee UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const ratelimit = {
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "5 m"),
    prefix: "rl:login",
  }),
  forgotPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:forgot",
  }),
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "rl:ai",
  }),
  forum: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    prefix: "rl:forum",
  }),
  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "rl:mut",
  }),
} as const;

export type RatelimitKey = keyof typeof ratelimit;
