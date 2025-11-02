interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  errors?: unknown[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly success: boolean = false;
  public readonly errors: unknown[];

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    const {
      status = 500,
      code = "INTERNAL_ERROR",
      details = null,
      errors = [],
    } = options;

    this.status = status;
    this.code = code;
    this.details = details;
    this.errors = errors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized", options: ApiErrorOptions = {}) {
    super(message, { ...options, status: 401, code: "UNAUTHORIZED" });
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not Found", options: ApiErrorOptions = {}) {
    super(message, { ...options, status: 404, code: "NOT_FOUND" });
  }
}

export class InternalServerError extends ApiError {
  constructor(
    message: string = "Internal Server Error",
    options: ApiErrorOptions = {}
  ) {
    super(message, { ...options, status: 500, code: "INTERNAL_SERVER_ERROR" });
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad Request", options: ApiErrorOptions = {}) {
    super(message, { ...options, status: 400, code: "BAD_REQUEST" });
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = "Conflict", options: ApiErrorOptions = {}) {
    super(message, { ...options, status: 409, code: "CONFLICT" });
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden", options: ApiErrorOptions = {}) {
    super(message, { ...options, status: 403, code: "FORBIDDEN" });
  }
}
