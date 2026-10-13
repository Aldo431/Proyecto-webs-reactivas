import { z } from "zod";

const seedEnvSchema = z.object({
  MONGODB_URI: z
    .string({ error: "Falta la variable de entorno MONGODB_URI." })
    .trim()
    .min(1, "Falta la variable de entorno MONGODB_URI."),
  SEED_SELLER_PASSWORD: z
    .string({ error: "Falta la variable de entorno SEED_SELLER_PASSWORD." })
    .min(
      8,
      "SEED_SELLER_PASSWORD debe tener al menos 8 caracteres (contraseña del vendedor de prueba).",
    )
    .max(100, "SEED_SELLER_PASSWORD no puede superar los 100 caracteres."),
});

export interface SeedEnv {
  mongodbUri: string;
  sellerPassword: string;
}

export type SeedEnvResult =
  | { success: true; env: SeedEnv }
  | { success: false; message: string };

// Valida solo lo que necesita el seed (no exige JWT_SECRET). Se ejecuta antes
// de conectar para que una configuración incompleta no escriba nada.
export function parseSeedEnv(
  source: Record<string, string | undefined>,
): SeedEnvResult {
  const parsed = seedEnvSchema.safeParse(source);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("\n");
    return { success: false, message };
  }
  return {
    success: true,
    env: {
      mongodbUri: parsed.data.MONGODB_URI,
      sellerPassword: parsed.data.SEED_SELLER_PASSWORD,
    },
  };
}
