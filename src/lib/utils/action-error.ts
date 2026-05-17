// Plain object representation de AppError para retornar desde Server
// Actions. Next.js Server Actions usa structured clone para serializar
// los valores de retorno; instances de Error subclases (como AppError)
// pierden custom properties (code, statusCode) durante el clone. Esto
// causa que el cliente reciba respuestas inconsistentes con status >= 400
// y content-type != "text/plain", disparando "An unexpected response
// was received from the server" en fetchServerAction de Next.js.
//
// Convencion del proyecto:
// - Services y repositorios usan AppError class (jerarquia + ergonomia).
// - Server Actions retornan Result<T, ActionError> con plain objects.
// - Helpers en este archivo convierten AppError -> ActionError en la
//   frontera server action -> client.
//
// Para mostrar field-level errors de Zod (validacion inline en form),
// ActionError incluye fieldErrors opcional. El form decide si los usa
// inline en cada campo o solo el toast general.

import type { ZodError } from "zod";
import type { AppError } from "@/core/errors/classes";

export type ActionError = {
  code: string;
  message: string;
  statusCode: number;
  fieldErrors?: Record<string, string[]>;
};

export function toActionError(error: AppError): ActionError {
  return {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
  };
}

export function validationErrorToActionError(
  zodError: ZodError,
  fallbackMessage: string,
): ActionError {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return {
    code: "VALIDATION_FAILED",
    message: zodError.issues[0]?.message ?? fallbackMessage,
    statusCode: 400,
    fieldErrors:
      Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

// Fallback para throws inesperados capturados por try-catch top-level
// en server actions. Mensaje generico (no leak detalles tecnicos al user).
export function unexpectedActionError(): ActionError {
  return {
    code: "UNEXPECTED",
    message: "Error inesperado. Intenta de nuevo.",
    statusCode: 500,
  };
}
