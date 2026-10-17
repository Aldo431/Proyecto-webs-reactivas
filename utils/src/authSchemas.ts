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

export const publicUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  email: z.email(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
