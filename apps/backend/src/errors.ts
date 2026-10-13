export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Debes iniciar sesión.") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends HttpError {
  constructor(
    message = "Ya existe una cuenta con ese correo electrónico.",
  ) {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado.") {
    super(404, message);
    this.name = "NotFoundError";
  }
}
