import { z } from "zod";
import { publicUserSchema } from "./authSchemas.ts";

export const MFA_CODE_LENGTH = 6;
export const MFA_LOGIN_TTL_MS = 5 * 60 * 1000;
export const MFA_SETUP_TTL_MS = 10 * 60 * 1000;
export const MFA_MAX_ATTEMPTS = 5;
export const MFA_MAX_RESENDS = 3;

export const mfaPurposeSchema = z.enum(["login", "enable", "disable"]);
export const mfaCodeSchema = z
  .string({ error: "El código debe tener 6 dígitos." })
  .regex(/^\d{6}$/, "El código debe tener 6 dígitos.");
export const mfaChallengeIdSchema = z
  .string({ error: "Identificador de desafío inválido." })
  .min(1, "Identificador de desafío inválido.");

export const mfaVerifyInputSchema = z.object({
  challengeId: mfaChallengeIdSchema,
  code: mfaCodeSchema,
});

export const mfaEnableConfirmSchema = z.object({
  challengeId: mfaChallengeIdSchema,
  code: mfaCodeSchema,
});

export const mfaDisableInputSchema = z.object({
  challengeId: mfaChallengeIdSchema,
  code: mfaCodeSchema,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const mfaResendInputSchema = z.object({
  challengeId: mfaChallengeIdSchema,
});

export const mfaRequiredSchema = z.object({
  mfaRequired: z.literal(true),
  challengeId: mfaChallengeIdSchema,
  message: z.string().min(1),
  devCode: mfaCodeSchema.optional(),
});

export const loginResponseSchema = z.union([
  publicUserSchema,
  mfaRequiredSchema,
]);

export const mfaActionResponseSchema = z.object({
  message: z.string().min(1),
  devCode: mfaCodeSchema.optional(),
});

export const mfaStatusSchema = z.object({ enabled: z.boolean() });

export type MfaPurpose = z.infer<typeof mfaPurposeSchema>;
export type MfaRequiredResult = z.infer<typeof mfaRequiredSchema>;
export type MfaActionResponse = z.infer<typeof mfaActionResponseSchema>;
