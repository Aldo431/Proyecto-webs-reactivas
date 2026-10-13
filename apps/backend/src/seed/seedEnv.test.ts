import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSeedEnv } from "./seedEnv.ts";

describe("parseSeedEnv", () => {
  it("acepta MONGODB_URI y una contraseña de al menos 8 caracteres", () => {
    const result = parseSeedEnv({
      MONGODB_URI: "mongodb://localhost:27017/tiendadcc",
      SEED_SELLER_PASSWORD: "12345678",
    });

    expect(result).toEqual({
      success: true,
      env: {
        mongodbUri: "mongodb://localhost:27017/tiendadcc",
        sellerPassword: "12345678",
      },
    });
  });

  it("falla con un mensaje claro si falta SEED_SELLER_PASSWORD", () => {
    const result = parseSeedEnv({ MONGODB_URI: "mongodb://localhost/x" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBe(
        "Falta la variable de entorno SEED_SELLER_PASSWORD.",
      );
    }
  });

  it("falla si la contraseña tiene menos de 8 caracteres o está vacía", () => {
    for (const password of ["corta", ""]) {
      const result = parseSeedEnv({
        MONGODB_URI: "mongodb://localhost/x",
        SEED_SELLER_PASSWORD: password,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain("SEED_SELLER_PASSWORD");
      }
    }
  });

  it("informa todas las variables que faltan", () => {
    const result = parseSeedEnv({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("MONGODB_URI");
      expect(result.message).toContain("SEED_SELLER_PASSWORD");
    }
  });
});

describe("script de seed", () => {
  const backendDir = fileURLToPath(new URL("../..", import.meta.url));

  function runScript(env: Record<string, string>) {
    // Entorno explícito: no hereda MONGODB_URI ni secretos reales. Nunca
    // llega a conectar porque la validación ocurre antes.
    return spawnSync(process.execPath, ["src/scripts/seed.ts"], {
      cwd: backendDir,
      env: { PATH: process.env.PATH ?? "", ...env },
      encoding: "utf-8",
      timeout: 30000,
    });
  }

  it("termina con código 1 y un mensaje claro si falta SEED_SELLER_PASSWORD", () => {
    const result = runScript({
      MONGODB_URI: "mongodb://127.0.0.1:1/tiendadcc-seed-test",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Falta la variable de entorno SEED_SELLER_PASSWORD.",
    );
    expect(result.stderr).toContain("apps/backend/.env");
    // No intentó conectar ni ejecutar el seed.
    expect(result.stderr).not.toContain("El seed falló");
    expect(result.stdout).toBe("");
  });

  it("termina con código 1 si la contraseña es demasiado corta", () => {
    const result = runScript({
      MONGODB_URI: "mongodb://127.0.0.1:1/tiendadcc-seed-test",
      SEED_SELLER_PASSWORD: "corta",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("al menos 8 caracteres");
    expect(result.stdout).toBe("");
  });
});
