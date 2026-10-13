import type { Response } from "express";
import { getEnv } from "../config/env.ts";

export const SESSION_COOKIE = "token";

function cookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().nodeEnv === "production",
    path: "/",
  };
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, cookieOptions());
}
