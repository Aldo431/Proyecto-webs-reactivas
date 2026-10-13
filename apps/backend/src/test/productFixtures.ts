import type { Express } from "express";
import request from "supertest";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";

const PASSWORD = "secreto123";

export interface TestSeller {
  id: string;
  cookie: string;
}

// Crea un usuario y devuelve su id y la cookie de sesión real (login).
export async function createSeller(
  app: Express,
  username: string,
  displayName = username,
): Promise<TestSeller> {
  const email = `${username}@dcc.uchile.cl`;
  const user = await User.create({
    username,
    displayName,
    email,
    passwordHash: await hashPassword(PASSWORD),
  });
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });
  const raw = response.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.[0];
  if (response.status !== 200 || !cookie) {
    throw new Error("No se pudo iniciar sesión en el test.");
  }
  return { id: user._id.toString(), cookie };
}

const HEADERS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ],
};

// Bytes de una "imagen" con la firma correcta del tipo y relleno de ceros.
export function makeImageBytes(
  mime: keyof typeof HEADERS = "image/png",
  total = 64,
): Buffer {
  const header = HEADERS[mime] ?? [];
  const bytes = Buffer.alloc(Math.max(total, header.length));
  Buffer.from(header).copy(bytes);
  return bytes;
}

export function makeDataUrl(
  mime: keyof typeof HEADERS = "image/png",
  total = 64,
): string {
  return `data:${mime};base64,${makeImageBytes(mime, total).toString("base64")}`;
}

interface ProductSeed {
  name?: string;
  category?: "Tazas" | "Poleras" | "Stickers";
  price?: number;
  image?: string;
  featured?: boolean;
  createdAt?: Date;
}

let counter = 0;

export async function createProduct(sellerId: string, seed: ProductSeed = {}) {
  counter += 1;
  return Product.create({
    name: seed.name ?? `Producto ${counter}`,
    description: "Descripción de prueba.",
    category: seed.category ?? "Tazas",
    price: seed.price ?? 6000,
    image: seed.image ?? "/images/taza-dcc.png",
    featured: seed.featured ?? false,
    seller: sellerId,
    ...(seed.createdAt ? { createdAt: seed.createdAt } : {}),
  });
}
