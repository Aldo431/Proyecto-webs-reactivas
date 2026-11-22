import { z } from "zod";
import { ORDER_MAX_LINES, ORDER_MAX_QUANTITY } from "./orderLimits.ts";

export const STUDENT_EMAIL_DOMAIN = "uchile.cl";
export const STUDENT_DISCOUNT_PERCENT = 20;
export const PACK_3X2_FREE_UNITS = 1;
export const PACK_3X2_GROUP_SIZE = 3;
export const PACK_2X15_PERCENT = 15;
export const PACK_2X15_MIN_QUANTITY = 2;
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const STUDENT_EMAIL_MESSAGE =
  "Solo se pueden verificar correos institucionales de la U. de Chile.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isStudentEmail(email: string): boolean {
  const domain = normalizeEmail(email).split("@")[1];
  return (
    domain === STUDENT_EMAIL_DOMAIN ||
    (domain !== undefined &&
      domain.length > STUDENT_EMAIL_DOMAIN.length + 1 &&
      domain.endsWith(`.${STUDENT_EMAIL_DOMAIN}`))
  );
}

export const studentEmailField = z
  .string({ error: "Correo electrónico inválido." })
  .trim()
  .toLowerCase()
  .min(1, "Correo electrónico inválido.")
  .email("Ingresa un correo electrónico válido.")
  .refine(isStudentEmail, STUDENT_EMAIL_MESSAGE);

export const verificationRequestSchema = z.object({
  email: studentEmailField,
});

export const studentCodeField = z
  .string({ error: "El código debe tener 6 dígitos." })
  .regex(/^\d{6}$/, "El código debe tener 6 dígitos.");

export const verificationConfirmSchema = z.object({
  code: studentCodeField,
});

export const verificationResponseSchema = z.object({
  message: z.string().min(1),
  devCode: studentCodeField.optional(),
});

export const PROMOTION_TYPES = [
  "studentDiscount",
  "quantityPack3x2",
  "quantityPack2x15",
] as const;

export const promotionTypeSchema = z.enum(PROMOTION_TYPES);

const promotionPercentField = z
  .number({ error: "El porcentaje debe ser un entero entre 1 y 100." })
  .int("El porcentaje debe ser un entero entre 1 y 100.")
  .min(1, "El porcentaje debe ser un entero entre 1 y 100.")
  .max(100, "El porcentaje debe ser un entero entre 1 y 100.");

const discountLabelField = z.string().trim().min(1, "La etiqueta es obligatoria.");

export const promotionSchema = z.object({
  id: z.string().min(1),
  type: promotionTypeSchema,
  label: discountLabelField,
  active: z.boolean(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const promotionInputSchema = z
  .object({
    type: promotionTypeSchema,
    label: discountLabelField,
    active: z.boolean().default(true),
    percent: promotionPercentField.optional(),
    startsAt: z.iso.datetime().nullable().default(null),
    endsAt: z.iso.datetime().nullable().default(null),
  })
  .refine(
    (data) =>
      data.startsAt === null ||
      data.endsAt === null ||
      data.startsAt <= data.endsAt,
    { message: "La fecha de inicio debe ser anterior a la de término.", path: ["endsAt"] },
  );

const positiveIntField = z
  .number({ error: "El monto debe ser un número entero mayor a cero." })
  .int("El monto debe ser un número entero mayor a cero.")
  .positive("El monto debe ser un número entero mayor a cero.");

export const discountSchema = z.object({
  type: promotionTypeSchema,
  label: discountLabelField,
  amount: positiveIntField,
});

export const pricingLineSchema = z.object({
  productId: z.string().min(1, "Identificador de producto inválido."),
  variantId: z.string().min(1, "Identificador de variante inválido.").optional(),
  quantity: z
    .number({ error: "La cantidad debe ser un número entero positivo." })
    .int("La cantidad debe ser un número entero positivo.")
    .min(1, "La cantidad debe ser un número entero positivo.")
    .max(ORDER_MAX_QUANTITY, "La cantidad debe ser un número entero positivo."),
}).strict();

export const pricingQuoteInputSchema = z
  .object({
    items: z.array(pricingLineSchema).min(1, "El carrito está vacío.").max(
      ORDER_MAX_LINES,
      `Un pedido no puede tener más de ${ORDER_MAX_LINES} productos.`,
    ),
  })
  .strict();

export const pricingLineResultSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  unitPrice: positiveIntField,
  quantity: z.number().int().min(1),
  subtotal: positiveIntField,
  discount: discountSchema.nullable(),
});

export const pricingQuoteSchema = z.object({
  subtotal: z.number().int().nonnegative(),
  discounts: z.array(discountSchema),
  total: z.number().int().nonnegative(),
  savings: z.number().int().nonnegative(),
});

export type PromotionType = z.infer<typeof promotionTypeSchema>;
export type Promotion = z.infer<typeof promotionSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type PricingLine = z.infer<typeof pricingLineSchema>;
export type PricingQuoteInput = z.infer<typeof pricingQuoteInputSchema>;
export type PricingLineResult = z.infer<typeof pricingLineResultSchema>;
export type PricingQuote = z.infer<typeof pricingQuoteSchema>;
