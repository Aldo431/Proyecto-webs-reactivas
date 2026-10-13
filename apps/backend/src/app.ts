import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { getEnv } from "./config/env.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { authRoutes } from "./routes/authRoutes.ts";
import { usersRoutes } from "./routes/usersRoutes.ts";

export function createApp() {
  const env = getEnv();
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);

  app.use((_request: Request, response: Response) => {
    response.status(404).json({ message: "Ruta no encontrada." });
  });

  app.use(errorHandler);

  return app;
}
