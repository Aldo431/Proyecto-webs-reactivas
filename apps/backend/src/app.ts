import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { getEnv } from "./config/env.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { authRoutes } from "./routes/authRoutes.ts";
import { productsRoutes } from "./routes/productsRoutes.ts";
import { reviewsRoutes } from "./routes/reviewsRoutes.ts";
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

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/reviews", reviewsRoutes);

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ message: "Ruta no encontrada." });
  });

  app.use(errorHandler);

  return app;
}
