import { z } from "zod";

// Tope del historial de navegación (spec 006, RF-5): el backend conserva como
// máximo esta cantidad de visitas recientes por usuario.
export const MAX_PROD_HISTORY = 67;

const nameField = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio.")
  .max(80, "El nombre no puede superar los 80 caracteres.");

const emailField = z
  .string()
  .trim()
  .pipe(z.email("Ingresa un correo electrónico válido."));

const productIdField = z
  .string()
  .trim()
  .min(1, "Identificador de producto inválido.");

export const updateProfileSchema = z.object({
  name: nameField,
  email: emailField,
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
});

export const favoriteInputSchema = z.object({
  productId: productIdField,
});

export const historyInputSchema = z.object({
  productId: productIdField,
});

export const cartLineSchema = z.object({
  productId: productIdField,
  quantity: z
    .number()
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor a cero."),
});

export const cartSchema = z.array(cartLineSchema);

export const historyEntrySchema = z.object({
  productId: z.string().min(1),
  viewedAt: z.iso.datetime("Fecha de visita inválida."),
});

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  favorites: z.array(z.string()),
  history: z.array(historyEntrySchema),
  cart: z.array(cartLineSchema),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type FavoriteInput = z.infer<typeof favoriteInputSchema>;
export type HistoryVisitInput = z.infer<typeof historyInputSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type UserProfile = z.infer<typeof profileSchema>;
