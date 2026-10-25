/**
 * Erros de domínio. Cada classe tem `statusCode`, usado pelo errorHandler global
 * (middleware/error.middleware.ts) e pelos handleError dos controllers.
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/** 403 — autenticado mas sem permissão. */
export class AuthorizationError extends Error {
  public readonly statusCode: number = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** 403 — alias explícito de AuthorizationError (usar em código novo). */
export class ForbiddenError extends AuthorizationError {
  constructor(message = 'Sem permissão para esta operação') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** 409 — conflito (registo duplicado, estado incompatível). */
export class ConflictError extends Error {
  public readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Devolve o status HTTP de um erro de domínio conhecido, ou undefined. */
export const getErrorStatus = (error: any): number | undefined => {
  if (
    error instanceof ValidationError ||
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError
  ) {
    return error.statusCode;
  }
  return undefined;
};
