import type { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../models/User.ts";
import { startTestDatabase, stopTestDatabase } from "../test/mongoMemory.ts";
import {
  authenticateUser,
  createUser,
  findUserById,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from "./authService.ts";

let mongo: MongoMemoryServer;

const SECRET = "unit-test-secret";
const validRequest = {
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  password: "secreto123",
};

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

describe("hashPassword / verifyPassword", () => {
  it("hashea la contraseña y la verifica sin guardarla en claro", async () => {
    const hash = await hashPassword("secreto123");

    expect(hash).not.toBe("secreto123");
    expect(await verifyPassword("secreto123", hash)).toBe(true);
    expect(await verifyPassword("otra-contraseña", hash)).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  it("firma y verifica un token con el usuario", () => {
    const token = signToken("abc123", SECRET);
    expect(verifyToken(token, SECRET)).toBe("abc123");
  });

  it("rechaza un token con otro secreto o mal formado", () => {
    const token = signToken("abc123", SECRET);
    expect(verifyToken(token, "otro-secreto")).toBeNull();
    expect(verifyToken("no.es.un.jwt", SECRET)).toBeNull();
  });
});

describe("createUser", () => {
  it("crea el usuario con correo normalizado y hash", async () => {
    const user = await createUser({
      ...validRequest,
      email: "  Ana@DCC.uchile.CL  ",
    });

    expect(user.email).toBe("ana@dcc.uchile.cl");
    expect(user.name).toBe("Ana Pérez");
    expect(user.passwordHash).not.toBe(validRequest.password);
  });

  it("rechaza un correo duplicado aunque cambie el caso", async () => {
    await createUser(validRequest);

    await expect(
      createUser({ ...validRequest, email: "ANA@DCC.UCHILE.CL" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("authenticateUser / findUserById", () => {
  it("autentica con credenciales válidas y falla con las inválidas", async () => {
    const user = await createUser(validRequest);

    expect(
      await authenticateUser("Ana@DCC.uchile.cl", validRequest.password),
    ).not.toBeNull();
    expect(
      await authenticateUser(validRequest.email, "contraseña-incorrecta"),
    ).toBeNull();
    expect(
      await authenticateUser("nadie@dcc.uchile.cl", validRequest.password),
    ).toBeNull();

    expect(await findUserById(user._id.toString())).not.toBeNull();
    expect(await findUserById("no-es-un-id")).toBeNull();
  });
});
