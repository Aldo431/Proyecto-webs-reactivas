import type { Request, Response } from "express";
import { z } from "zod";
import { Counter } from "../models/Counter.ts";
import { MfaChallenge } from "../models/MfaChallenge.ts";
import { Order } from "../models/Order.ts";
import { Product } from "../models/Product.ts";
import { Promotion } from "../models/Promotion.ts";
import { Review } from "../models/Review.ts";
import { User } from "../models/User.ts";
import { seedDefaultPromotions } from "../services/promotionService.ts";

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
    Promotion.deleteMany({}),
    MfaChallenge.deleteMany({}),
    User.deleteMany({}),
  ]);
  response.status(204).end();
}

export async function seedPromotionsHandler(
  _request: Request,
  response: Response,
): Promise<void> {
  await seedDefaultPromotions();
  response.status(204).end();
}

export async function grantAdminHandler(
  request: Request,
  response: Response,
): Promise<void> {
  const parsed = z.string().trim().email().safeParse(request.query.email);
  if (!parsed.success) {
    response.status(400).json({ message: "Correo electrónico inválido." });
    return;
  }
  const result = await User.updateOne(
    { email: parsed.data },
    { $set: { role: "admin" } },
  );
  if (result.matchedCount === 0) {
    response.status(404).json({ message: "No se encontró al usuario." });
    return;
  }
  response.status(204).end();
}
