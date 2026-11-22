import { Router } from "express";
import {
  confirmVerificationCode,
  requestVerificationCode,
} from "../controllers/studentController.ts";
import { requireAuth } from "../middleware/auth.ts";
import { studentCodeRateLimit } from "../middleware/rateLimit.ts";

export const studentRoutes = Router();

studentRoutes.post("/verify", requireAuth, studentCodeRateLimit, requestVerificationCode);
studentRoutes.post("/confirm", requireAuth, confirmVerificationCode);
