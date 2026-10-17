import { Router } from "express";
import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  getProductImageHandler,
  listMyProductsHandler,
  listProductsHandler,
  updateProductHandler,
} from "../controllers/productsController.ts";
import { requireAuth } from "../middleware/auth.ts";
import { productReviewsRoutes } from "./reviewsRoutes.ts";

export const productsRoutes = Router();

productsRoutes.get("/", listProductsHandler);
// `/mine` debe registrarse antes que `/:id` (spec 008, RF-8).
productsRoutes.get("/mine", requireAuth, listMyProductsHandler);
// El subrouter de reseñas debe registrarse antes que `/:id` (spec 010, RF-1/RF-2).
productsRoutes.use("/:id/reviews", productReviewsRoutes);
productsRoutes.get("/:id/image", getProductImageHandler);
productsRoutes.get("/:id", getProductHandler);
productsRoutes.post("/", requireAuth, createProductHandler);
productsRoutes.patch("/:id", requireAuth, updateProductHandler);
productsRoutes.delete("/:id", requireAuth, deleteProductHandler);
