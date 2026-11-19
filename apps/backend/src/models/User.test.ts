import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import { User } from "./User.ts";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await startTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await User.deleteMany({});
});

const base = {
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  passwordHash: "hash",
};

describe("User.role", () => {
  it("es user por defecto", async () => {
    const user = await User.create(base);

    expect(user.role).toBe("user");
    expect(user.toPublicJSON().role).toBe("user");
  });

  it("acepta admin", async () => {
    const user = await User.create({ ...base, role: "admin" });

    expect(user.toPublicJSON().role).toBe("admin");
  });

  it("rechaza un rol distinto de user y admin", async () => {
    await expect(
      User.create({ ...base, role: "superadmin" as never }),
    ).rejects.toThrow("Rol inválido.");
  });

  it("trata un documento legado sin role como user", async () => {
    const { insertedId } = await User.collection.insertOne({ ...base });

    const user = await User.findById(insertedId);

    expect(user).not.toBeNull();
    expect(user?.toPublicJSON().role).toBe("user");
  });
});
