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
