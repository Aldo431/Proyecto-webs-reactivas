import { Schema, model, type Types } from "mongoose";
import {
  ORDER_FOLIO_PATTERN,
  ORDER_MAX_LINES,
  ORDER_MAX_QUANTITY,
  type Order as PublicOrder,
} from "@tiendadcc/utils";

export interface OrderItemFields {
  product: Types.ObjectId;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderFields {
  user: Types.ObjectId;
  folio: string;
  items: OrderItemFields[];
  total: number;
  status: "completado";
  createdAt: Date;
  updatedAt: Date;
}

const ORDER_STATUS = "completado";

const positiveInt = (label: string) => ({
  validator: (value: number) => Number.isInteger(value) && value > 0,
  message: `${label} debe ser un número entero mayor a cero.`,
});

// Validadores Mongoose como respaldo de los límites de Zod (spec 012, RF-3),
// igual que en Product y Review: la entrada se valida en Zod.
const orderItemSchema = new Schema<OrderItemFields>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio."],
    },
    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio."],
      trim: true,
      minlength: [1, "El nombre del producto es obligatorio."],
      maxlength: [
        80,
        "El nombre del producto no puede superar los 80 caracteres.",
      ],
    },
    image: {
      type: String,
      required: [true, "La imagen del producto es obligatoria."],
    },
    unitPrice: {
      type: Number,
      required: [true, "El precio unitario es obligatorio."],
      validate: positiveInt("El precio unitario"),
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria."],
      validate: {
        validator: (value: number) =>
          Number.isInteger(value) && value >= 1 && value <= ORDER_MAX_QUANTITY,
        message: `La cantidad debe ser un número entero entre 1 y ${ORDER_MAX_QUANTITY}.`,
      },
    },
    subtotal: {
      type: Number,
      required: [true, "El subtotal de la línea es obligatorio."],
      validate: positiveInt("El subtotal de la línea"),
    },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderFields>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es obligatorio."],
      index: true,
    },
    folio: {
      type: String,
      required: [true, "El folio es obligatorio."],
      unique: true,
      match: [ORDER_FOLIO_PATTERN, "Folio de pedido inválido."],
    },
    items: {
      type: [orderItemSchema],
      required: [true, "El pedido debe tener al menos una línea."],
      validate: {
        validator: (value: OrderItemFields[]) =>
          Array.isArray(value) &&
          value.length >= 1 &&
          value.length <= ORDER_MAX_LINES,
        message: `El pedido debe tener entre 1 y ${ORDER_MAX_LINES} líneas.`,
      },
    },
    total: {
      type: Number,
      required: [true, "El total del pedido es obligatorio."],
      validate: positiveInt("El total del pedido"),
    },
    status: {
      type: String,
      enum: { values: [ORDER_STATUS], message: "Estado de pedido inválido." },
      default: ORDER_STATUS,
      required: [true, "El estado del pedido es obligatorio."],
    },
  },
  { timestamps: true },
);

// Listado del perfil: más recientes primero, con desempate estable (RF-8).
orderSchema.index({ user: 1, createdAt: -1, _id: -1 });

export const Order = model<OrderFields>("Order", orderSchema);

/** Pedido leído desde Mongoose (documento o `lean()`), con la forma mínima. */
export interface OrderLike {
  _id: Types.ObjectId;
  folio: string;
  status: "completado";
  items: OrderItemFields[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

// Contrato público (RF-8, RF-9): exponer `id` (string), snapshot verbatim de
// la compra y fechas ISO; nunca el documento interno ni datos de tarjeta.
export function toPublicOrder(order: OrderLike): PublicOrder {
  return {
    id: order._id.toString(),
    folio: order.folio,
    status: order.status,
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      name: item.name,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
