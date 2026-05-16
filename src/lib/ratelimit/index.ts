// Rate limiters basados en Upstash (sliding window) para los endpoints
// del MVP que pueden ser abusados por bots o ataques de fuerza bruta.
//
// Política de SECURITY.md tabla linea 577:
// - login: 5/15min por IP (anti brute-force de passwords).
// - forgotPassword: 3/1h por IP (anti spam de emails de reset).
// - ai: 20/1h por user (Gemini cuesta plata).
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
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:login",
  }),
  forgotPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
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
