import { Router } from "express";
import {
  grantAdminHandler,
  resetDatabaseHandler,
  seedPromotionsHandler,
} from "../controllers/testingController.ts";

export const testingRoutes = Router();

// Solo se monta con NODE_ENV=test (ver app.ts); nunca existe en desarrollo ni
// en producción (spec 016, RF-3).
testingRoutes.post("/reset", resetDatabaseHandler);
testingRoutes.post("/promotions", seedPromotionsHandler);
testingRoutes.post("/admin", grantAdminHandler);
