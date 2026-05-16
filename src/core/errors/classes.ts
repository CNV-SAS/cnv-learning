// Jerarquia de errores del proyecto (ARCHITECTURE.md lineas 432-467).
//
// AppError es la base. Cada subclase fija el statusCode HTTP por defecto
// para que server actions y route handlers puedan responder con el codigo
// correcto sin logica adicional.
//
// Convencion: server actions retornan Result<T, AppError> en vez de hacer
// throw para errores esperables (lib/utils/result.ts). Solo casos
// excepcionales (bug, infraestructura caida) propagan la excepcion.

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404);
  }
}

export class DomainError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}

export class InfrastructureError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 500);
  }
}
