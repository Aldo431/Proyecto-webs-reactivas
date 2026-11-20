import mongoose, { type ClientSession, type Types } from "mongoose";
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
import { isObjectIdString } from "./productService.ts";

export const PRODUCT_UNAVAILABLE_MESSAGE =
  "Uno de los productos de tu carrito ya no está disponible.";
export const VARIANT_OUT_OF_STOCK_MESSAGE =
  "La variante seleccionada no tiene stock suficiente.";
const FOLIO_CONFLICT_MESSAGE =
  "No se pudo asignar el folio del pedido. Inténtalo de nuevo.";

// Proyección propia para el snapshot del pedido: nunca `READ_PROJECTION`, que
// recorta las data URL a "data:" y dejaría rota la imagen del histórico.
const SNAPSHOT_PROJECTION = { name: 1, price: 1, image: 1, variants: 1 } as const;

interface SnapshotRow {
  _id: Types.ObjectId;
  name: string;
  price: number;
  image: string;
  variants?: Array<{
    _id: Types.ObjectId;
    name: string;
    stock: number;
    priceAdjustment?: number;
  }>;
}

function buildFolio(sequence: number): string {
  const year = new Date().getFullYear();
  return `PED-${year}-${String(sequence).padStart(4, "0")}`;
}

// Secuencia atómica del folio (spec 012, RF-4): un solo `$inc` garantiza un
// correlativo único incluso con pagos concurrentes; los huecos por fallos de
// pedido son aceptados y el índice único de `folio` es el respaldo.
async function nextFolioSequence(session: ClientSession): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    ORDER_FOLIO_COUNTER_ID,
    { $inc: { value: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      session,
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
  session: ClientSession,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sequence = await nextFolioSequence(session);
    try {
      const [created] = await Order.create(
        [
          {
            user: userId,
            folio: buildFolio(sequence),
            items,
            total,
            status: "completado",
          },
        ],
        { session },
      );
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
  const ids = input.items.map((item) => item.productId);
  for (const id of ids) {
    if (!isObjectIdString(id)) {
      throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
    }
  }

  const session = await mongoose.startSession();
  let createdOrder: PublicOrder | undefined;
  try {
    await session.withTransaction(async () => {
      const products = await Product.find(
    { _id: { $in: ids } },
    SNAPSHOT_PROJECTION,
      ).session(session).lean<SnapshotRow[]>();
      const byId = new Map(
        products.map((product) => [product._id.toString(), product]),
      );

      const items: OrderItemFields[] = [];
      let total = 0;

      for (const item of input.items) {
      const product = byId.get(item.productId);
      if (!product) {
        throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
      }
      const selectedVariant = item.variantId === undefined
        ? product.variants?.[0]
        : product.variants?.find(
            (variant) => variant._id.toString() === item.variantId,
          );
      if (item.variantId !== undefined && selectedVariant === undefined) {
        throw new HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE);
      }
      if (selectedVariant !== undefined) {
        const updated = await Product.updateOne(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id: selectedVariant._id,
                stock: { $gte: item.quantity },
              },
            },
          },
          { $inc: { "variants.$[variant].stock": -item.quantity } },
          {
            session,
            arrayFilters: [
              { "variant._id": selectedVariant._id, "variant.stock": { $gte: item.quantity } },
            ],
          },
        );
        if (updated.modifiedCount !== 1) {
          throw new ConflictError(VARIANT_OUT_OF_STOCK_MESSAGE);
        }
      }
      const unitPrice =
        product.price + (selectedVariant?.priceAdjustment ?? 0);
      const subtotal = unitPrice * item.quantity;
      total += subtotal;
      // Snapshot verbatim, incluida la imagen (spec 012, D3): el pedido es
      // autosuficiente aunque el producto se edite o elimine después.
      items.push({
        product: product._id,
        ...(selectedVariant === undefined
          ? {}
          : {
              variant: selectedVariant._id,
              variantName: selectedVariant.name,
            }),
        name: product.name,
        image: product.image,
        unitPrice,
        quantity: item.quantity,
        subtotal,
      });
    }

      createdOrder = await createOrderWithFolio(
        userId,
        items,
        total,
        session,
      );
    });
    return createdOrder as PublicOrder;
  } finally {
    await session.endSession();
  }
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
