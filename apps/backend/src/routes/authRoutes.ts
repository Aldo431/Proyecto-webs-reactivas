import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
  validateResetToken,
} from "../controllers/authController.ts";
import { requireAuth } from "../middleware/auth.ts";
import { forgotPasswordRateLimit } from "../middleware/rateLimit.ts";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);
authRoutes.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
authRoutes.get("/validate-reset-token/:token", validateResetToken);
authRoutes.post("/reset-password", resetPassword);
