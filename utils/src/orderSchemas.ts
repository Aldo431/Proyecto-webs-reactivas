import { z } from "zod";

// Topes de un pedido (spec 012, RF-2, RF-3): cantidad 1 a 999 por línea y como
// máximo 50 líneas por pedido.
export const ORDER_MAX_QUANTITY = 999;
export const ORDER_MAX_LINES = 50;
export const ORDER_FOLIO_PATTERN = /^PED-\d{4}-\d{4,}$/;
export const ORDER_EMPTY_MESSAGE = "El carrito está vacío.";

const PRODUCT_ID_MESSAGE = "Identificador de producto inválido.";
const QUANTITY_MESSAGE =
  "La cantidad debe ser un número entero entre 1 y 999.";

const productIdField = z
  .string({ error: PRODUCT_ID_MESSAGE })
  .trim()
  .min(1, PRODUCT_ID_MESSAGE);

const quantityField = z
  .number({ error: QUANTITY_MESSAGE })
  .int(QUANTITY_MESSAGE)
  .min(1, QUANTITY_MESSAGE)
  .max(ORDER_MAX_QUANTITY, QUANTITY_MESSAGE);

export const orderItemInputSchema = z.object({
  productId: productIdField,
  quantity: quantityField,
});

// Entrada de creación (spec 012, RF-2, RNF-9): solo `productId` y `quantity`
// por línea. El esquema no acepta precios, totales ni datos de tarjeta: el
// servidor calcula el snapshot desde la base de datos (z.object descarta
// claves desconocidas).
export const createOrderInputSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, ORDER_EMPTY_MESSAGE)
    .max(
      ORDER_MAX_LINES,
      `Un pedido no puede tener más de ${ORDER_MAX_LINES} productos.`,
    ),
});

const POSITIVE_INT_MESSAGE =
  "El precio debe ser un número entero mayor a cero.";

const positiveIntField = z
  .number({ error: POSITIVE_INT_MESSAGE })
  .int(POSITIVE_INT_MESSAGE)
  .positive(POSITIVE_INT_MESSAGE);

// Línea pública del pedido: snapshot tomado al momento de la compra.
export const orderLineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1),
  image: z.string().min(1),
  unitPrice: positiveIntField,
  quantity: z.number().int().min(1).max(ORDER_MAX_QUANTITY),
  subtotal: positiveIntField,
});

// Estado único e inmutable del pedido (spec 012, RF-5).
export const orderStatusSchema = z.literal("completado");

export const orderSchema = z.object({
  id: z.string().min(1),
  folio: z
    .string()
    .regex(ORDER_FOLIO_PATTERN, "Folio de pedido inválido."),
  status: orderStatusSchema,
  items: z.array(orderLineSchema).min(1).max(ORDER_MAX_LINES),
  total: positiveIntField,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const orderListSchema = z.array(orderSchema);

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type OrderLine = z.infer<typeof orderLineSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderList = z.infer<typeof orderListSchema>;
