import { z } from "zod";

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export interface PaymentFormValues {
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  holderName: string;
}

// Quita todo carácter no numérico (espacios, guiones, letras); el valor
// visible se formatea con espacios, pero la validación usa solo dígitos.
export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, "");
}

// Agrupa los dígitos de a 4 con espacios (grupos uniformes también en Amex).
export function formatCardNumber(value: string): string {
  const digits = normalizeCardNumber(value).slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
}

// Detección por prefijo: Visa "4", Amex "34"/"37", Mastercard "51"–"55" o
// primeros 4 dígitos entre 2221 y 2720. Cualquier otro caso es "unknown".
export function detectCardBrand(value: string): CardBrand {
  const digits = normalizeCardNumber(value);
  if (digits.startsWith("4")) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (digits.length >= 4) {
    const prefix = Number(digits.slice(0, 4));
    if (prefix >= 2221 && prefix <= 2720) return "mastercard";
  }
  return "unknown";
}

export function expectedCardLength(brand: CardBrand): 15 | 16 {
  return brand === "amex" ? 15 : 16;
}

// Número completo: solo dígitos y longitud esperada para la marca detectada.
export function isCompleteCardNumber(value: string): boolean {
  const digits = normalizeCardNumber(value);
  return digits.length === expectedCardLength(detectCardBrand(digits));
}

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/;

// Vencimiento vigente: mes/año >= mes/año actual (el mes actual es válido).
// `now` es inyectable para tests deterministas.
export function isExpiryCurrentOrFuture(
  expiry: string,
  now: Date = new Date(),
): boolean {
  const match = EXPIRY_PATTERN.exec(expiry);
  if (match === null) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year > currentYear || (year === currentYear && month >= currentMonth);
}

const cardNumberField = z
  .string()
  .refine((value) => {
    const digits = normalizeCardNumber(value);
    return (
      digits.length > 0 &&
      digits.length === expectedCardLength(detectCardBrand(digits))
    );
  }, "Ingresa un número de tarjeta válido.");

const expiryField = z
  .string()
  .regex(EXPIRY_PATTERN, "Usa el formato MM/AA.")
  .refine(
    (value) => isExpiryCurrentOrFuture(value),
    "La tarjeta está vencida.",
  );

const cvcField = z
  .string()
  .regex(/^\d{3,4}$/, "El CVC debe tener 3 o 4 dígitos.");

const holderNameField = z
  .string()
  .trim()
  .min(1, "Ingresa el nombre del titular.")
  .max(100, "El nombre del titular no puede superar los 100 caracteres.");

export const paymentFormSchema = z.object({
  email: z.string().trim().pipe(z.email("Correo electrónico inválido.")),
  cardNumber: cardNumberField,
  expiry: expiryField,
  cvc: cvcField,
  holderName: holderNameField,
});
