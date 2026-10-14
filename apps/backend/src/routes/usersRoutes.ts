import { Router } from "express";
import {
  addFavoriteHandler,
  getProfile,
  recordVisitHandler,
  removeFavoriteHandler,
  replaceCartHandler,
  updateProfile,
} from "../controllers/usersController.ts";
import { requireAuth } from "../middleware/auth.ts";

export const usersRoutes = Router();

usersRoutes.use(requireAuth);

usersRoutes.get("/me", getProfile);
usersRoutes.put("/me", updateProfile);
usersRoutes.post("/me/favorites", addFavoriteHandler);
usersRoutes.delete("/me/favorites/:productId", removeFavoriteHandler);
usersRoutes.post("/me/history", recordVisitHandler);
usersRoutes.put("/me/cart", replaceCartHandler);
