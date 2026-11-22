import { Router } from "express";
import {
  confirmMfaEnable,
  disableMfa,
  requestMfaDisable,
  requestMfaEnable,
  resendMfaCode,
  verifyMfaLogin,
} from "../controllers/mfaController.ts";
import { requireAuth } from "../middleware/auth.ts";
import { mfaRateLimit } from "../middleware/rateLimit.ts";

export const mfaRoutes = Router();

mfaRoutes.post("/enable", requireAuth, requestMfaEnable);
mfaRoutes.post("/enable/confirm", requireAuth, confirmMfaEnable);
mfaRoutes.post("/disable/request", requireAuth, requestMfaDisable);
mfaRoutes.post("/disable", requireAuth, disableMfa);
mfaRoutes.post("/verify", mfaRateLimit, verifyMfaLogin);
mfaRoutes.post("/resend", mfaRateLimit, resendMfaCode);
