import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z
    .string({ error: "Falta la variable de entorno MONGODB_URI." })
    .trim()
    .min(1, "Falta la variable de entorno MONGODB_URI."),
  JWT_SECRET: z
    .string({ error: "Falta la variable de entorno JWT_SECRET." })
    .trim()
    .min(1, "Falta la variable de entorno JWT_SECRET."),
  PORT: z.coerce
    .number({ error: "PORT debe ser un número." })
    .int("PORT debe ser un número entero.")
    .positive("PORT debe ser un número positivo.")
    .default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"], {
      error: "NODE_ENV debe ser development, production o test.",
    })
    .default("development"),
  CLIENT_ORIGIN: z
    .string()
    .trim()
    .min(1, "CLIENT_ORIGIN no puede estar vacío.")
    .default("http://localhost:5173"),
});

export interface Env {
  mongodbUri: string;
  jwtSecret: string;
  port: number;
  nodeEnv: "development" | "production" | "test";
  clientOrigin: string;
}

export type EnvParseResult =
  | { success: true; env: Env }
  | { success: false; message: string };

export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
): EnvParseResult {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const variable = issue.path.join(".");
        return variable ? `- ${variable}: ${issue.message}` : `- ${issue.message}`;
      })
      .join("\n");
    return {
      success: false,
      message: `Configuración de entorno inválida:\n${issues}`,
    };
  }

  const data = result.data;
  return {
    success: true,
    env: {
      mongodbUri: data.MONGODB_URI,
      jwtSecret: data.JWT_SECRET,
      port: data.PORT,
      nodeEnv: data.NODE_ENV,
      clientOrigin: data.CLIENT_ORIGIN,
    },
  };
}

export function loadEnv(): Env {
  const result = parseEnv();
  if (!result.success) {
    console.error(result.message);
    process.exit(1);
  }
  return result.env;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
