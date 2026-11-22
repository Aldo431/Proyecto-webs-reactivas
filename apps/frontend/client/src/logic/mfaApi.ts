import {
  mfaActionResponseSchema,
  mfaChallengeIdSchema,
  mfaDisableInputSchema,
  mfaEnableConfirmSchema,
  mfaResendInputSchema,
  mfaVerifyInputSchema,
  publicUserSchema,
} from "@tiendadcc/utils";
import type { ZodType } from "zod";
import type { AuthSuccess } from "./authApi.ts";
import type { ApiFailure } from "./apiFailure.ts";
import {
  apiPath,
  failureFromIssues,
  failureFromResponse,
  networkFailure,
  unexpectedResponseFailure,
} from "./apiFailure.ts";
import { mfaErrorFromStatus } from "./mfaFormat.ts";

export type MfaChallengeResult =
  | { ok: true; challengeId: string; message: string; devCode?: string }
  | ApiFailure;

export type MfaActionResult =
  | { ok: true; message: string; devCode?: string }
  | ApiFailure;

export type MfaVerifyResult = AuthSuccess | ApiFailure;

const challengeResponseSchema = mfaActionResponseSchema.extend({
  challengeId: mfaChallengeIdSchema,
});

const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Inténtalo de nuevo.";

function toChallengeResult(
  data: { challengeId: string; message: string; devCode?: string | undefined },
): MfaChallengeResult {
  return {
    ok: true,
    challengeId: data.challengeId,
    message: data.message,
    ...(data.devCode === undefined ? {} : { devCode: data.devCode }),
  };
}

function toActionResult(
  data: { message: string; devCode?: string | undefined },
): MfaActionResult {
  return {
    ok: true,
    message: data.message,
    ...(data.devCode === undefined ? {} : { devCode: data.devCode }),
  };
}

async function postAndParse<T, TResult>(
  path: string,
  body: unknown,
  expectedStatus: number,
  schema: ZodType<T>,
  toResult: (data: T) => TResult,
): Promise<TResult | ApiFailure> {
  try {
    const response = await fetch(apiPath(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (response.status === expectedStatus) {
      const parsed = schema.safeParse(await response.json());
      return parsed.success
        ? toResult(parsed.data)
        : unexpectedResponseFailure();
    }
    return failureFromResponse(
      response,
      mfaErrorFromStatus(response.status),
    );
  } catch {
    return networkFailure(NETWORK_MESSAGE);
  }
}

export async function requestMfaEnable(): Promise<MfaChallengeResult> {
  const result = await postAndParse(
    "/api/auth/mfa/enable",
    {},
    202,
    challengeResponseSchema,
    toChallengeResult,
  );
  return result;
}

export async function confirmMfaEnable(
  challengeId: string,
  code: string,
): Promise<MfaActionResult> {
  const input = mfaEnableConfirmSchema.safeParse({ challengeId, code });
  if (!input.success) return failureFromIssues(input.error);
  const result = await postAndParse(
    "/api/auth/mfa/enable/confirm",
    input.data,
    200,
    mfaActionResponseSchema,
    toActionResult,
  );
  return result;
}

export async function requestMfaDisable(): Promise<MfaChallengeResult> {
  const result = await postAndParse(
    "/api/auth/mfa/disable/request",
    {},
    202,
    challengeResponseSchema,
    toChallengeResult,
  );
  return result;
}

export async function disableMfa(
  challengeId: string,
  code: string,
  password: string,
): Promise<MfaActionResult> {
  const input = mfaDisableInputSchema.safeParse({ challengeId, code, password });
  if (!input.success) return failureFromIssues(input.error);
  const result = await postAndParse(
    "/api/auth/mfa/disable",
    input.data,
    200,
    mfaActionResponseSchema,
    toActionResult,
  );
  return result;
}

export async function resendMfaCode(challengeId: string): Promise<MfaActionResult> {
  const input = mfaResendInputSchema.safeParse({ challengeId });
  if (!input.success) return failureFromIssues(input.error);
  const result = await postAndParse(
    "/api/auth/mfa/resend",
    input.data,
    202,
    mfaActionResponseSchema,
    toActionResult,
  );
  return result;
}

export async function verifyMfaLogin(
  challengeId: string,
  code: string,
): Promise<MfaVerifyResult> {
  const input = mfaVerifyInputSchema.safeParse({ challengeId, code });
  if (!input.success) return failureFromIssues(input.error);

  try {
    const response = await fetch(apiPath("/api/auth/mfa/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input.data),
    });
    if (response.status === 200) {
      const parsed = publicUserSchema.safeParse(await response.json());
      return parsed.success
        ? { ok: true, user: parsed.data }
        : unexpectedResponseFailure();
    }
    return failureFromResponse(response, mfaErrorFromStatus(response.status));
  } catch {
    return networkFailure(NETWORK_MESSAGE);
  }
}
