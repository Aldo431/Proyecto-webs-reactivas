import type { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { grantAdminRole, parseMakeAdminInput } from "./adminRoleService.ts";

let mongo: MongoMemoryReplSet;

beforeAll(async () => {
  mongo = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await User.deleteMany({});
});

async function createAna(role?: "admin") {
  return User.create({
    username: "anaperez",
    displayName: "Ana Pérez",
    email: "ana@dcc.uchile.cl",
    passwordHash: "hash",
    ...(role ? { role } : {}),
  });
}

describe("grantAdminRole", () => {
  it("promueve una cuenta existente", async () => {
    await createAna();

    const result = await grantAdminRole("ana@dcc.uchile.cl");

    expect(result).toEqual({ status: "granted", username: "anaperez" });
    expect((await User.findOne({ username: "anaperez" }))?.role).toBe("admin");
  });

  it("informa si la cuenta ya era administradora", async () => {
    await createAna("admin");

    const result = await grantAdminRole("ana@dcc.uchile.cl");

    expect(result).toEqual({ status: "already-admin", username: "anaperez" });
  });

  it("es idempotente en dos ejecuciones seguidas", async () => {
    await createAna();

    const first = await grantAdminRole("ana@dcc.uchile.cl");
    const second = await grantAdminRole("ana@dcc.uchile.cl");

    expect(first.status).toBe("granted");
    expect(second.status).toBe("already-admin");
  });

  it("informa si no existe la cuenta", async () => {
    expect(await grantAdminRole("nadie@dcc.uchile.cl")).toEqual({
      status: "not-found",
    });
  });

  it("encuentra la cuenta con mayúsculas y espacios", async () => {
    await createAna();

    const result = await grantAdminRole("  ANA@DCC.UCHILE.CL  ");

    expect(result).toEqual({ status: "granted", username: "anaperez" });
  });

  it("promueve una cuenta legada sin role", async () => {
    await User.collection.insertOne({
      username: "vieja",
      displayName: "Vieja",
      email: "vieja@dcc.uchile.cl",
      passwordHash: "hash",
    });

    const result = await grantAdminRole("vieja@dcc.uchile.cl");

    expect(result).toEqual({ status: "granted", username: "vieja" });
  });
});

describe("parseMakeAdminInput", () => {
  const env = { MONGODB_URI: "mongodb://localhost:27017/tienda" };

  it("acepta un correo válido y MONGODB_URI", () => {
    expect(parseMakeAdminInput(["ana@dcc.uchile.cl"], env)).toEqual({
      success: true,
      email: "ana@dcc.uchile.cl",
      mongodbUri: env.MONGODB_URI,
    });
  });

  it("muestra el uso si falta el argumento", () => {
    const result = parseMakeAdminInput([], env);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain(
        "Uso: npm run make-admin -w backend -- <correo>",
      );
    }
  });

  it("muestra el uso si el correo no es válido", () => {
    const result = parseMakeAdminInput(["no-es-correo"], env);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain(
        "Uso: npm run make-admin -w backend -- <correo>",
      );
    }
  });

  it("falla en español si falta MONGODB_URI", () => {
    const result = parseMakeAdminInput(["ana@dcc.uchile.cl"], {});

    expect(result).toEqual({
      success: false,
      message: "Falta la variable de entorno MONGODB_URI.",
    });
  });
});
