import { Schema, model } from "mongoose";

export interface CounterFields {
  _id: string;
  value: number;
}

// Secuencia global para los folios de pedido (spec 012, RF-4). Se actualiza
// de forma atómica con `findByIdAndUpdate($inc)`, por lo que no requiere
// transacciones ni locks (RNF-5).
const counterSchema = new Schema<CounterFields>(
  {
    _id: {
      type: String,
      required: [true, "El nombre del contador es obligatorio."],
    },
    value: {
      type: Number,
      required: [true, "El valor del contador es obligatorio."],
      default: 0,
      validate: {
        validator: (value: number) =>
          Number.isInteger(value) && value >= 0,
        message: "El valor del contador debe ser un entero no negativo.",
      },
    },
  },
  { versionKey: false },
);

export const Counter = model<CounterFields>("Counter", counterSchema);

/** Nombre del contador global para los folios de pedido (spec 012, RF-4). */
export const ORDER_FOLIO_COUNTER_ID = "orderFolio";
