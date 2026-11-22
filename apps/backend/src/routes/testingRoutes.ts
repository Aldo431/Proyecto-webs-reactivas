import { Router } from "express";
import { resetDatabaseHandler } from "../controllers/testingController.ts";

export const testingRoutes = Router();

// Solo se monta con NODE_ENV=test (ver app.ts); nunca existe en desarrollo ni
// en producción (spec 016, RF-3).
testingRoutes.post("/reset", resetDatabaseHandler);
