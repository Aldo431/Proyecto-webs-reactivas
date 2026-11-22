import { Router } from "express";
import {
  createPromotionHandler,
  deactivatePromotionHandler,
  listPromotions,
  updatePromotionHandler,
} from "../controllers/promotionsController.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";

export const promotionsRoutes = Router();

promotionsRoutes.get("/", listPromotions);
promotionsRoutes.post("/", requireAuth, requireAdmin, createPromotionHandler);
promotionsRoutes.patch("/:id", requireAuth, requireAdmin, updatePromotionHandler);
promotionsRoutes.delete("/:id", requireAuth, requireAdmin, deactivatePromotionHandler);
