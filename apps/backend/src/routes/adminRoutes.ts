import { Router } from "express";
import {
  deleteAdminProductHandler,
  deleteAdminReviewHandler,
  getAdminSession,
  listAdminProductsHandler,
  listAdminReviewsHandler,
  listAdminUsersHandler,
  setProductFeaturedHandler,
  setUserRoleHandler,
} from "../controllers/adminController.ts";
import { requireAdmin, requireAuth } from "../middleware/auth.ts";

export const adminRoutes = Router();

// 401 (sin sesión) antes que 403 (sin rol de administrador).
adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get("/session", getAdminSession);
adminRoutes.get("/products", listAdminProductsHandler);
adminRoutes.patch("/products/:id/featured", setProductFeaturedHandler);
adminRoutes.delete("/products/:id", deleteAdminProductHandler);
adminRoutes.get("/users", listAdminUsersHandler);
adminRoutes.patch("/users/:id/role", setUserRoleHandler);
adminRoutes.get("/reviews", listAdminReviewsHandler);
adminRoutes.delete("/reviews/:id", deleteAdminReviewHandler);
