import { Router } from "express";
import {
  createOrderHandler,
  listOrdersHandler,
} from "../controllers/ordersController.ts";
import { requireAuth } from "../middleware/auth.ts";

export const ordersRoutes = Router();

// `/api/orders` exige sesión en ambos métodos (spec 012, RF-9).
ordersRoutes.get("/", requireAuth, listOrdersHandler);
ordersRoutes.post("/", requireAuth, createOrderHandler);
