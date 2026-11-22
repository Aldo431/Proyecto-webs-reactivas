import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { MFA_CODE_LENGTH } from "./mfaSchemas.ts";

export {
  MFA_CODE_LENGTH,
  MFA_LOGIN_TTL_MS,
  MFA_SETUP_TTL_MS,
  MFA_MAX_ATTEMPTS,
  MFA_MAX_RESENDS,
} from "./mfaSchemas.ts";

export function generateMfaCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(MFA_CODE_LENGTH, "0");
}

export function hashMfaCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

export function safeEqualMfaCode(a: string, b: string): boolean {
  const first = Buffer.from(a, "hex");
  const second = Buffer.from(b, "hex");
  return first.length === second.length && timingSafeEqual(first, second);
}
