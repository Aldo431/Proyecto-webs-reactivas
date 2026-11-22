import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";

const message = "Has excedido el límite de solicitudes. Intenta más tarde.";

const ipRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (request) => {
    const email: unknown = request.body?.email;
    return typeof email === "string"
      ? `email:${email.trim().toLowerCase()}`
      : `ip:${ipKeyGenerator(request.ip ?? "")}`;
  },
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordRateLimit: RequestHandler = (request, response, next) => {
  ipRateLimit(request, response, (ipError?: unknown) => {
    if (ipError) {
      next(ipError);
      return;
    }
    if (response.headersSent) return;
    emailRateLimit(request, response, next);
  });
};

// Exposed so tests can start each scenario with fresh in-memory counters.
export function resetForgotPasswordRateLimits(ip: string, email: string): void {
  ipRateLimit.resetKey(ip);
  emailRateLimit.resetKey(`email:${email.trim().toLowerCase()}`);
}

function keyFromRequest(request: Parameters<RequestHandler>[0], field: string): string {
  const value: unknown = request.body?.[field];
  if (typeof value === "string" && value.length > 0) {
    return `${field}:${value.trim().toLowerCase()}`;
  }
  return `ip:${ipKeyGenerator(request.ip ?? "")}`;
}

const studentCodeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (request) => keyFromRequest(request, "email"),
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
});

export const studentCodeRateLimit: RequestHandler = (request, response, next) => {
  studentCodeRateLimiter(request, response, next);
};

const mfaRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (request) => keyFromRequest(request, "challengeId"),
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
});

export const mfaRateLimit: RequestHandler = (request, response, next) => {
  mfaRateLimiter(request, response, next);
};

export function resetMfaRateLimits(challengeId?: string): void {
  if (challengeId) {
    mfaRateLimiter.resetKey(`challengeId:${challengeId.trim().toLowerCase()}`);
  }
  mfaRateLimiter.resetKey(`ip:127.0.0.1`);
}

export function resetStudentCodeRateLimits(email: string): void {
  studentCodeRateLimiter.resetKey(`email:${email.trim().toLowerCase()}`);
}
