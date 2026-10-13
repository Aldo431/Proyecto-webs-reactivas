import { Router } from "express";
import {
  login,
  logout,
  me,
  register,
} from "../controllers/authController.ts";
import { requireAuth } from "../middleware/auth.ts";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);
