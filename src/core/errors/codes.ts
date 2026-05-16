// Catalogo cerrado de error codes del MVP (ARCHITECTURE.md lineas 472-507).
//
// Lista finita y estable. Cada code referencia un error reproducible del
// dominio o de la infraestructura. NO inventar codes ad-hoc desde el codigo:
// si necesitas uno nuevo, agregalo aqui con commit explicito documentando
// el caso de uso.
//
// Convencion: los codes se usan con AppError o subclase, ej.:
//   new ValidationError(ErrorCodes.VALIDATION_FAILED, "Email invalido")
//
// Frontend mapea code -> mensaje user-friendly cuando aplica (ver
// components de UI para casos con texto custom).

export const ErrorCodes = {
  // Auth (handled por AuthenticationError, 401)
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",

  // Authorization (handled por AuthorizationError, 403)
  AUTHZ_ROLE_REQUIRED: "AUTHZ_ROLE_REQUIRED",
  AUTHZ_NOT_OWNER: "AUTHZ_NOT_OWNER",
  AUTHZ_CANNOT_GRADE: "AUTHZ_CANNOT_GRADE",

  // Assignments (DomainError o NotFoundError)
  ASSIGNMENT_NOT_FOUND: "ASSIGNMENT_NOT_FOUND",
  SUBMISSION_NOT_FOUND: "SUBMISSION_NOT_FOUND",
  SUBMISSION_DEADLINE_PASSED: "SUBMISSION_DEADLINE_PASSED",
  SUBMISSION_ALREADY_GRADED: "SUBMISSION_ALREADY_GRADED",

  // Lessons (NotFoundError)
  LESSON_NOT_FOUND: "LESSON_NOT_FOUND",
  LESSON_NOT_IN_COURSE: "LESSON_NOT_IN_COURSE",

  // Certificates (NotFoundError o DomainError)
  CERTIFICATE_NOT_FOUND: "CERTIFICATE_NOT_FOUND",
  CERTIFICATE_NOT_ELIGIBLE: "CERTIFICATE_NOT_ELIGIBLE",
  CERTIFICATE_ALREADY_ISSUED: "CERTIFICATE_ALREADY_ISSUED",
  CERTIFICATE_REVOKED: "CERTIFICATE_REVOKED",

  // AI (InfrastructureError o DomainError dependiendo)
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_PARSE_FAILED: "AI_PARSE_FAILED",
  AI_PROVIDER_ERROR: "AI_PROVIDER_ERROR",

  // Infrastructure (InfrastructureError, 500)
  DATABASE_ERROR: "DATABASE_ERROR",
  EMAIL_PROVIDER_ERROR: "EMAIL_PROVIDER_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",

  // Validation general (ValidationError, 400). SECURITY.md linea 178
  // referencia este code en el ejemplo de createThread action.
  VALIDATION_FAILED: "VALIDATION_FAILED",

  // Rate limiting (AppError con statusCode 429). SECURITY.md linea 562
  // referencia este code en el ejemplo de loginAction.
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
