import { Router } from "express";
import { quotePrices } from "../controllers/pricingController.ts";
import { optionalAuth } from "../middleware/auth.ts";

export const pricingRoutes = Router();

pricingRoutes.post("/quote", optionalAuth, quotePrices);
