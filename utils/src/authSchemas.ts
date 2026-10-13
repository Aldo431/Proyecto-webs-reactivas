import { z } from "zod";

const nameField = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "El nombre no puede superar los 80 caracteres.");

const emailField = z
  .string()
  .trim()
  .pipe(z.email("Ingresa un correo electrónico válido."));

const passwordField = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(100, "La contraseña no puede superar los 100 caracteres.");

const registerBaseSchema = z.object({
  name: nameField,
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
  name: z.string().min(1),
  email: z.email(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
