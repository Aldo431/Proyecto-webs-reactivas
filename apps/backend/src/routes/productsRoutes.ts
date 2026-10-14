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

export const productsRoutes = Router();

productsRoutes.get("/", listProductsHandler);
// `/mine` debe registrarse antes que `/:id` (spec 008, RF-8).
productsRoutes.get("/mine", requireAuth, listMyProductsHandler);
productsRoutes.get("/:id/image", getProductImageHandler);
productsRoutes.get("/:id", getProductHandler);
productsRoutes.post("/", requireAuth, createProductHandler);
productsRoutes.patch("/:id", requireAuth, updateProductHandler);
productsRoutes.delete("/:id", requireAuth, deleteProductHandler);
