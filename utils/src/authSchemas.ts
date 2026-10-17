import { z } from "zod";
import { usernameField, displayNameField, emailField } from "./identityFields.ts";

const passwordField = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(100, "La contraseña no puede superar los 100 caracteres.");

const registerBaseSchema = z.object({
  username: usernameField,
  displayName: displayNameField,
  email: emailField,
  password: passwordField,
});

export const registerRequestSchema = registerBaseSchema;

export const registerInputSchema = registerBaseSchema
  .extend({
    passwordConfirm: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirm"],
  });

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const forgotPasswordInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Correo electrónico inválido.")
    .max(255, "El correo electrónico no puede superar los 255 caracteres.")
    .pipe(z.email("Correo electrónico inválido.")),
});

export const resetPasswordInputSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "El token de restablecimiento no es válido."),
  password: passwordField,
});

export const validateResetTokenResponseSchema = z.object({
  valid: z.boolean(),
});

export const forgotPasswordResponseSchema = z.object({
  message: z.string().min(1),
  devToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const resetPasswordResponseSchema = z.object({
  message: z.string().min(1),
});

export const publicUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.email(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ValidateResetTokenResponse = z.infer<
  typeof validateResetTokenResponseSchema
>;
export type PublicUser = z.infer<typeof publicUserSchema>;
