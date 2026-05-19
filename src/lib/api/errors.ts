// Helpers compartidos para route handlers: mapeo AppError ->
// NextResponse.json con el statusCode de cada subclase.
//
// Extraido en Bloque 8 sub-bloque 8.3 cuando aparecio el 3er
// handler (quiz/play, quiz/submit, grading/suggest). Mantiene
// consistencia del shape de respuesta { ok: false, error: {
// code, message } } across todos los endpoints.

import { NextResponse } from "next/server";
import type { AppError } from "@/core/errors/classes";

export function errorResponse(error: AppError): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message },
    },
    { status: error.statusCode },
  );
}

// Fallback para throws inesperados capturados por try-catch top-
// level en route handlers. Mensaje generico sin leak de detalles
// tecnicos al cliente.
export function unexpectedResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: "UNEXPECTED", message: "Error inesperado." },
    },
    { status: 500 },
  );
}
