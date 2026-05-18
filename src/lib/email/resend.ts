// Cliente Resend wrappeado con timeout y fault-tolerance.
// ARCHITECTURE.md regla 10: ninguna llamada externa sin timeout
// explicito. Resend SDK v6 no expone AbortSignal directo en su
// API publica; usamos Promise.race contra setTimeout(10s) que da
// el mismo efecto practico (el caller no espera mas; el envio
// puede seguir en background hasta resolver o expirar).
//
// Fault-tolerant: si Resend falla por timeout, network o error
// del provider, log warn y return sin throw. El caller decide si
// el flow continua (en Bloque 6 el grading queda persistido aun
// si el email no llega; el monitoring detecta gaps).
//
// Skip silencioso (con warn) si RESEND_API_KEY no esta presente
// en el environment. Permite que dev local sin Resend configurado
// no rompa el flow de grading.

import { Resend } from "resend";
import { logger } from "@/core/logger/logger";

const TIMEOUT_MS = 10_000;
const DEFAULT_FROM = "noreply@cnvsystem.com";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY no configurada; skip email send", {
      to: params.to,
      subject: params.subject,
    });
    return;
  }

  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("RESEND_TIMEOUT")),
      TIMEOUT_MS,
    ),
  );

  try {
    const response = await Promise.race([
      resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      timeout,
    ]);

    if (response.error) {
      logger.warn("Resend reporto error (no bloquea flow)", {
        to: params.to,
        subject: params.subject,
        resendError: response.error.message,
      });
      return;
    }

    logger.info("Email enviado", {
      to: params.to,
      subject: params.subject,
      messageId: response.data?.id,
    });
  } catch (e) {
    logger.warn("Resend fallo (timeout o excepcion; no bloquea flow)", {
      to: params.to,
      subject: params.subject,
      error: e instanceof Error ? e.message : String(e),
    });
    // NO throw: fault-tolerant per Bloque 6 plan.
  }
}
