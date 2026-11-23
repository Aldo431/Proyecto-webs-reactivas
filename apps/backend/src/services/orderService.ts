import {
  type CreateOrderInput,
  type Order as PublicOrder,
} from "@tiendadcc/utils";
import { ConflictError, HttpError } from "../errors.ts";
import {
  Counter,
  ORDER_FOLIO_COUNTER_ID,
} from "../models/Counter.ts";
import {
  Order,
  toPublicOrder,
  type OrderItemFields,
  type OrderLike,
} from "../models/Order.ts";
import { Product } from "../models/Product.ts";
import { quoteForUser, VARIANT_OUT_OF_STOCK_MESSAGE } from "./pricingService.ts";

export const PRODUCT_UNAVAILABLE_MESSAGE =
  "Uno de los productos de tu carrito ya no está disponible.";
const FOLIO_CONFLICT_MESSAGE =
  "No se pudo asignar el folio del pedido. Inténtalo de nuevo.";

function buildFolio(sequence: number): string {
  const year = new Date().getFullYear();
  return `PED-${year}-${String(sequence).padStart(4, "0")}`;
}

// Secuencia atómica del folio (spec 012, RF-4): un solo `$inc` garantiza un
// correlativo único incluso con pagos concurrentes; los huecos por fallos de
// pedido son aceptados y el índice único de `folio` es el respaldo.
async function nextFolioSequence(): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    ORDER_FOLIO_COUNTER_ID,
    { $inc: { value: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
  return counter?.value ?? 1;
}

function isFolioDuplicateError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; keyValue?: unknown };
  if (candidate.code !== 11000) return false;
  const keyValue = candidate.keyValue;
  return typeof keyValue === "object" && keyValue !== null && "folio" in keyValue;
}

// Crea el pedido con folio atómico; reintenta una sola vez si el folio ya
// existe (datos heredados) y responde 409 si sigue en conflicto.
async function createOrderWithFolio(
  userId: string,
  items: OrderItemFields[],
  total: number,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sequence = await nextFolioSequence();
    try {
      const [created] = await Order.create([
        {
          user: userId,
          folio: buildFolio(sequence),
          items,
          total,
          status: "completado",
        },
      ]);
      if (created === undefined) {
        throw new Error("No se pudo crear el pedido.");
      }
      return toPublicOrder(created);
    } catch (error) {
      if (!isFolioDuplicateError(error)) {
        throw error;
      }
    }
  }
  throw new ConflictError(FOLIO_CONFLICT_MESSAGE);
}

// Crea el pedido con el snapshot calculado desde la base de datos (spec 012,
// RF-3): el cliente envía solo productId y quantity; precios, total y fechas
// son los del servidor. El pedido nace asociado a la sesión (RF-9) y con
// estado `completado` (RF-5).
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<PublicOrder> {
  const priced = await quoteForUser(userId, input.items, {
    stockErrorStatus: 409,
  });
  const items: OrderItemFields[] = [];

  for (const [index, line] of priced.resolved.entries()) {
    const pricedLine = priced.lines[index];
    if (!pricedLine) {
      throw new Error("No se pudo calcular la línea del pedido.");
    }
    if (line.variant !== undefined) {
      const updated = await Product.updateOne(
        {
          _id: line.product._id,
          variants: {
            $elemMatch: {
              _id: line.variant._id,
              stock: { $gte: line.quantity },
            },
          },
        },
        { $inc: { "variants.$[variant].stock": -line.quantity } },
        {
          arrayFilters: [
            {
              "variant._id": line.variant._id,
              "variant.stock": { $gte: line.quantity },
            },
          ],
        },
      );
      if (updated.modifiedCount !== 1) {
        throw new ConflictError(VARIANT_OUT_OF_STOCK_MESSAGE);
      }
    }
    items.push({
      product: line.product._id,
      ...(line.variant === undefined
        ? {}
        : { variant: line.variant._id, variantName: line.variant.name }),
      name: line.product.name,
      image: line.product.image,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      subtotal: pricedLine.subtotal,
      discount: pricedLine.discount,
    });
  }

  return createOrderWithFolio(userId, items, priced.quote.total);
}

// Pedidos del usuario, del más reciente al más antiguo (spec 012, RF-8).
export async function listOrders(
  userId: string,
): Promise<PublicOrder[]> {
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1, _id: -1 })
    .lean<OrderLike[]>();
  return orders.map(toPublicOrder);
}
