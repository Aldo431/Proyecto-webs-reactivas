import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { getEnv } from "./config/env.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { adminRoutes } from "./routes/adminRoutes.ts";
import { authRoutes } from "./routes/authRoutes.ts";
import { mfaRoutes } from "./routes/mfaRoutes.ts";
import { ordersRoutes } from "./routes/ordersRoutes.ts";
import { pricingRoutes } from "./routes/pricingRoutes.ts";
import { productsRoutes } from "./routes/productsRoutes.ts";
import { promotionsRoutes } from "./routes/promotionsRoutes.ts";
import { reviewsRoutes } from "./routes/reviewsRoutes.ts";
import { studentRoutes } from "./routes/studentRoutes.ts";
import { testingRoutes } from "./routes/testingRoutes.ts";
import { usersRoutes } from "./routes/usersRoutes.ts";

// Solo la publicación y la edición de productos transportan imágenes (spec 008,
// RF-4): ahí el cuerpo puede llegar a 2 MB; el resto de la API conserva el
// límite por defecto de `express.json()` (100 KB). Se prueba con `i` y barra
// final opcional porque el enrutador de Express tampoco distingue ambos.
const LARGE_BODY_LIMIT = "2mb";
const CREATE_PRODUCT_PATH = /^\/api\/products\/?$/i;
const EDIT_PRODUCT_PATH = /^\/api\/products\/[^/]+\/?$/i;

function carriesProductImage(request: Request): boolean {
  return (
    (request.method === "POST" && CREATE_PRODUCT_PATH.test(request.path)) ||
    (request.method === "PATCH" && EDIT_PRODUCT_PATH.test(request.path))
  );
}

function createJsonParser() {
  const defaultParser = express.json();
  const largeParser = express.json({ limit: LARGE_BODY_LIMIT });
  return (request: Request, response: Response, next: NextFunction): void => {
    const parser = carriesProductImage(request) ? largeParser : defaultParser;
    parser(request, response, next);
  };
}

export function createApp() {
  const env = getEnv();
  const app = express();

  app.use(createJsonParser());
  app.use(cookieParser());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));

  app.use("/api/auth/mfa", mfaRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/reviews", reviewsRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/promotions", promotionsRoutes);
  app.use("/api/pricing", pricingRoutes);

  // Reinicio de la base para los tests E2E (spec 016, RF-3): solo en modo test.
  if (env.nodeEnv === "test") {
    app.use("/api/testing", testingRoutes);
  }

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ message: "Ruta no encontrada." });
  });

  app.use(errorHandler);

  return app;
}
