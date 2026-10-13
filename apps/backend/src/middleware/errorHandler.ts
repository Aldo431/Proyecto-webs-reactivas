import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors.ts";

const DUPLICATE_KEY_CODE = 11000;

const DATABASE_UNAVAILABLE_ERRORS = new Set([
  "MongooseServerSelectionError",
  "MongoServerSelectionError",
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoNotConnectedError",
  "MongoTimeoutError",
]);

function isBodyParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: unknown }).status === 400
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  );
}

function isDatabaseUnavailable(error: unknown): boolean {
  return (
    error instanceof Error && DATABASE_UNAVAILABLE_ERRORS.has(error.name)
  );
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const [first] = issue.path;
      const field = typeof first === "string" ? first : "form";
      fieldErrors[field] ??= issue.message;
    }
    response.status(400).json({
      message: "Revisa los datos ingresados.",
      fieldErrors,
    });
    return;
  }

  if (isBodyParseError(error)) {
    response.status(400).json({
      message: "El cuerpo de la petición no es un JSON válido.",
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }

  if (isDuplicateKeyError(error)) {
    const keyValue = (error as { keyValue?: unknown }).keyValue;
    if (
      typeof keyValue === "object" &&
      keyValue !== null &&
      "username" in keyValue
    ) {
      response.status(409).json({
        message: "Ese nombre de usuario ya está en uso.",
      });
      return;
    }
    response.status(409).json({
      message: "Ya existe una cuenta con ese correo electrónico.",
    });
    return;
  }

  if (isDatabaseUnavailable(error)) {
    response.status(503).json({
      message:
        "El servicio no está disponible en este momento. Inténtalo más tarde.",
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    message: "Ocurrió un error inesperado. Inténtalo de nuevo.",
  });
};
