import { z } from "zod";

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El nombre de usuario es obligatorio.")
  .max(80, "El nombre de usuario no puede superar los 80 caracteres.");

export const displayNameField = z
  .string()
  .trim()
  .min(1, "El nombre a mostrar es obligatorio.")
  .max(80, "El nombre a mostrar no puede superar los 80 caracteres.");

export const emailField = z
  .string()
  .trim()
  .pipe(z.email("Ingresa un correo electrónico válido."));
