// Provider IA wrappeado: cliente Gemini con timeout, error mapping
// y observability. ARCHITECTURE.md regla 10: ninguna llamada externa
// sin timeout explicito. SDK @google/generative-ai no expone
// AbortSignal directo en la API publica; usamos Promise.race contra
// setTimeout para el cutoff del caller (la peticion real puede seguir
// en background hasta el server-side timeout de Gemini).
//
// Mapping de errores a codes especificos:
//   - AI_TIMEOUT: el caller corto la espera tras N ms.
//   - AI_RATE_LIMITED: detectado por status 429 o mensaje "rate".
//     Mensaje user-friendly distinto (espera y reintenta).
//   - AI_PROVIDER_ERROR: otros (network, server error, etc).
//
// El provider abstracto permite swap Gemini -> Groq (u otro) en
// el futuro sin tocar el callsite (assignments/ai/suggest-grade).

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AppError,
  InfrastructureError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import { logger } from "@/core/logger/logger";

// 15s en lugar de 8s: el primer call de la sesion observa cold
// start de Gemini que supera los 8s en gemini-2.5-flash. El reintento
// rara vez excede 5s, pero el primero requiere holgura para que el
// docente no vea AI_TIMEOUT en su primera interaccion.
const DEFAULT_TIMEOUT_MS = 15_000;
// Modelo configurable via env var. El default refleja lo que la
// GEMINI_API_KEY del plan free de Google AI Studio tiene habilitado
// (gemini-2.0-flash arroja limit: 0 con esa key). El nombre se
// propaga a logs y a ai_grading_suggestions.model como audit trail.
const DEFAULT_MODEL = "gemini-2.5-flash";
const MODEL = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

export interface AiCompleteResult {
  text: string;
  latencyMs: number;
  model: string;
}

export interface AiCompleteOptions {
  task: string;
  timeoutMs?: number;
}

function classifyError(error: unknown): AppError {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg === "AI_TIMEOUT") {
    return new InfrastructureError(
      ErrorCodes.AI_TIMEOUT,
      "La sugerencia tardó demasiado. Intenta de nuevo.",
    );
  }

  // Heuristica para rate limit (429). El SDK de Gemini no expone un
  // tipo dedicado, asi que matcheamos por status y palabra clave.
  if (
    msg.includes("429") ||
    msg.toLowerCase().includes("rate") ||
    msg.toLowerCase().includes("quota")
  ) {
    return new InfrastructureError(
      ErrorCodes.AI_RATE_LIMITED,
      "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
    );
  }

  return new InfrastructureError(
    ErrorCodes.AI_PROVIDER_ERROR,
    "Error del proveedor IA. Intenta de nuevo.",
  );
}

export const aiProvider = {
  model: MODEL,

  async complete(
    prompt: string,
    options: AiCompleteOptions,
  ): Promise<Result<AiCompleteResult, AppError>> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("GEMINI_API_KEY no configurada", { task: options.task });
      return err(
        new InfrastructureError(
          ErrorCodes.AI_PROVIDER_ERROR,
          "Proveedor IA no configurado.",
        ),
      );
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const startTime = Date.now();

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs),
    );

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
          // JSON mode estructurado del SDK: el modelo retorna JSON
          // valido. El caller (suggest-grade) hace Zod validate sobre
          // el shape esperado.
          responseMimeType: "application/json",
        },
      });

      const response = await Promise.race([
        model.generateContent(prompt),
        timeout,
      ]);

      const latencyMs = Date.now() - startTime;
      const text = response.response.text();

      logger.info("AI provider success", {
        task: options.task,
        model: MODEL,
        latencyMs,
      });

      return ok({ text, latencyMs, model: MODEL });
    } catch (e) {
      const latencyMs = Date.now() - startTime;
      const appError = classifyError(e);
      logger.warn("AI provider error", {
        task: options.task,
        latencyMs,
        code: appError.code,
        message: e instanceof Error ? e.message : String(e),
      });
      return err(appError);
    }
  },
};
