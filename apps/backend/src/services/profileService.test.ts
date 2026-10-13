import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MAX_PROD_HISTORY } from "@tiendadcc/utils";
import { ConflictError, UnauthorizedError } from "../errors.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "./authService.ts";
import {
  addFavorite,
  recordVisit,
  removeFavorite,
  replaceCart,
  updateProfileData,
} from "./profileService.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";

let mongo: MongoMemoryServer;

async function createTestUser(
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const passwordHash = await hashPassword(overrides.password ?? "secreto123");
  return User.create({
    name: overrides.name ?? "Ana Pérez",
    email: overrides.email ?? "ana@dcc.uchile.cl",
    passwordHash,
  });
}

beforeAll(async () => {
  mongo = await startTestDatabase();
  await User.syncIndexes();
});

afterAll(async () => {
  await stopTestDatabase(mongo);
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe("updateProfileData", () => {
  it("actualiza nombre y correo normalizado con la contraseña correcta", async () => {
    const user = await createTestUser();

    const updated = await updateProfileData(user._id.toString(), {
      name: "  Ana P.  ",
      email: "  ANA@DCC.UCHILE.CL  ",
      currentPassword: "secreto123",
    });

    expect(updated?.name).toBe("Ana P.");
    expect(updated?.email).toBe("ana@dcc.uchile.cl");
    expect(updated?.toProfileJSON().emailVerified).toBe(false);
  });

  it("rechaza con 401 y no modifica nada si la contraseña es incorrecta", async () => {
    const user = await createTestUser();

    await expect(
      updateProfileData(user._id.toString(), {
        name: "Otro Nombre",
        email: "otro@dcc.uchile.cl",
        currentPassword: "incorrecta",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const reloaded = await User.findById(user._id);
    expect(reloaded?.name).toBe("Ana Pérez");
    expect(reloaded?.email).toBe("ana@dcc.uchile.cl");
  });

  it("rechaza con 409 el correo de otro usuario sin distinguir mayúsculas", async () => {
    const user = await createTestUser();
    await createTestUser({ email: "otro@dcc.uchile.cl" });

    await expect(
      updateProfileData(user._id.toString(), {
        name: "Ana Pérez",
        email: "OTRO@DCC.UCHILE.CL",
        currentPassword: "secreto123",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    const reloaded = await User.findById(user._id);
    expect(reloaded?.email).toBe("ana@dcc.uchile.cl");
  });

  it("acepta conservar el propio correo", async () => {
    const user = await createTestUser();

    const updated = await updateProfileData(user._id.toString(), {
      name: "Ana Renombrada",
      email: "ana@dcc.uchile.cl",
      currentPassword: "secreto123",
    });

    expect(updated?.name).toBe("Ana Renombrada");
  });

  it("devuelve null para un usuario inexistente", async () => {
    const updated = await updateProfileData("6712a4f3c9b1e24a8f0d1234", {
      name: "Nadie",
      email: "nadie@dcc.uchile.cl",
      currentPassword: "secreto123",
    });

    expect(updated).toBeNull();
  });
});

describe("addFavorite y removeFavorite", () => {
  it("agrega un favorito sin duplicarlo", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await addFavorite(id, "taza-dcc");
    const updated = await addFavorite(id, "taza-dcc");

    expect(updated?.favorites).toEqual(["taza-dcc"]);
  });

  it("mantiene un solo elemento ante altas concurrentes", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await Promise.all([
      addFavorite(id, "taza-dcc"),
      addFavorite(id, "taza-dcc"),
    ]);

    const reloaded = await User.findById(id);
    expect(reloaded?.favorites).toEqual(["taza-dcc"]);
  });

  it("elimina un favorito y es idempotente si no existe", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await addFavorite(id, "taza-dcc");
    const removed = await removeFavorite(id, "taza-dcc");
    expect(removed?.favorites).toEqual([]);

    const idempotent = await removeFavorite(id, "taza-dcc");
    expect(idempotent?.favorites).toEqual([]);
  });
});

describe("recordVisit", () => {
  it("mueve la visita al frente sin duplicar", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await recordVisit(id, "taza-dcc");
    await recordVisit(id, "polera-dcc");
    const updated = await recordVisit(id, "taza-dcc");

    expect(updated?.history.map((visit) => visit.productId)).toEqual([
      "taza-dcc",
      "polera-dcc",
    ]);
  });

  it(`conserva solo las ${MAX_PROD_HISTORY} visitas más recientes`, async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    for (let index = 0; index <= MAX_PROD_HISTORY; index += 1) {
      await recordVisit(id, `producto-${index}`);
    }

    const reloaded = await User.findById(id);
    expect(reloaded?.history).toHaveLength(MAX_PROD_HISTORY);
    expect(reloaded?.history[0]?.productId).toBe(
      `producto-${MAX_PROD_HISTORY}`,
    );
    expect(
      reloaded?.history.some((visit) => visit.productId === "producto-0"),
    ).toBe(false);
  });
});

describe("replaceCart", () => {
  it("reemplaza el carrito guardado", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await replaceCart(id, [{ productId: "taza-dcc", quantity: 2 }]);
    const updated = await replaceCart(id, [
      { productId: "polera-dcc", quantity: 1 },
    ]);

    expect(
      updated?.cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    ).toEqual([{ productId: "polera-dcc", quantity: 1 }]);
  });

  it("vacía el carrito con un arreglo vacío", async () => {
    const user = await createTestUser();
    const id = user._id.toString();

    await replaceCart(id, [{ productId: "taza-dcc", quantity: 2 }]);
    const updated = await replaceCart(id, []);

    expect(updated?.cart).toEqual([]);
  });
});
