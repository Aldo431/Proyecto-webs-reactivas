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
