import { z } from "zod";

const envSchema = z
  .object({
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
    // SMTP configuration (optional only in development's console bypass mode)
    SMTP_HOST: z.string().trim().min(1, "SMTP_HOST no puede estar vacío.").optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().trim().min(1, "SMTP_USER no puede estar vacío.").optional(),
    SMTP_PASS: z.string().min(1, "SMTP_PASS no puede estar vacío.").optional(),
    SMTP_FROM: z.string().trim().email().optional(),
  })
  .refine(
    (data) => {
      // Development can use the console bypass; production and tests must
      // validate explicit SMTP configuration (tests provide safe dummy values).
      if (data.NODE_ENV === "development") {
        return true;
      }
      // In production/test, all SMTP vars are required.
      return (
        data.SMTP_HOST !== undefined &&
        data.SMTP_PORT !== undefined &&
        data.SMTP_USER !== undefined &&
        data.SMTP_PASS !== undefined &&
        data.SMTP_FROM !== undefined
      );
    },
    {
      message:
        "En producción y test, las variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM son obligatorias.",
    },
  );

export interface Env {
  mongodbUri: string;
  jwtSecret: string;
  port: number;
  nodeEnv: "development" | "production" | "test";
  clientOrigin: string;
  smtpHost: string | undefined;
  smtpPort: number | undefined;
  smtpUser: string | undefined;
  smtpPass: string | undefined;
  smtpFrom: string | undefined;
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
      smtpHost: data.SMTP_HOST,
      smtpPort: data.SMTP_PORT,
      smtpUser: data.SMTP_USER,
      smtpPass: data.SMTP_PASS,
      smtpFrom: data.SMTP_FROM,
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
