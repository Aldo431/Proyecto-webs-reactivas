import { Router } from "express";
import {
  createReviewHandler,
  deleteReviewHandler,
  listProductReviewsHandler,
  updateReviewHandler,
} from "../controllers/reviewsController.ts";
import { requireAuth } from "../middleware/auth.ts";

// Subrouter montado en `/api/products/:id/reviews`: `mergeParams` expone el
// `id` del producto a estos handlers (spec 010, RF-1/RF-2).
export const productReviewsRoutes = Router({ mergeParams: true });

productReviewsRoutes.get("/", listProductReviewsHandler);
productReviewsRoutes.post("/", requireAuth, createReviewHandler);

export const reviewsRoutes = Router();

reviewsRoutes.put("/:id", requireAuth, updateReviewHandler);
reviewsRoutes.delete("/:id", requireAuth, deleteReviewHandler);
