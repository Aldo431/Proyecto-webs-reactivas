import type { Request, Response } from "express";
import { Counter } from "../models/Counter.ts";
import { Order } from "../models/Order.ts";
import { Product } from "../models/Product.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";

// Vacía todas las colecciones para que cada test E2E parta del mismo estado
// (spec 016, RF-3; patrón de la cátedra 09).
export async function resetDatabaseHandler(
  _request: Request,
  response: Response,
): Promise<void> {
  await Promise.all([
    Order.deleteMany({}),
    Counter.deleteMany({}),
    Review.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
  ]);
  response.status(204).end();
}
