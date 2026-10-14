import { z } from "zod";
import { productCategorySchema, productImageSchema } from "@tiendadcc/utils";
import { Product } from "../models/Product.ts";
import { User } from "../models/User.ts";
import { hashPassword } from "../services/authService.ts";

// Vendedor de prueba dueño de los productos del seed (spec 008, RF-12).
export const SEED_SELLER = {
  username: "tiendadcc",
  displayName: "TiendaDCC",
  email: "vendedor@tiendadcc.cl",
} as const;

const seedProductSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: productCategorySchema,
  price: z.number().int().positive(),
  image: productImageSchema,
  featured: z.boolean(),
});

const seedCatalogSchema = z
  .object({ products: z.array(seedProductSchema) })
  .refine(
    ({ products }) =>
      new Set(products.map((product) => product.id)).size === products.length &&
      new Set(products.map((product) => product.name)).size === products.length,
    { message: "El catálogo del seed repite ids o nombres." },
  );

export type SeedProduct = z.infer<typeof seedProductSchema>;

// Valida el contenido de `seed/products.json` (mismo formato que el catálogo
// original). Lanza ZodError si no cumple.
export function parseSeedProducts(raw: unknown): SeedProduct[] {
  return seedCatalogSchema.parse(raw).products;
}

interface QuantifiedLine {
  productId: string;
  quantity: number;
}

interface VisitLike {
  productId: string;
}

export interface UserReferences<
  Visit extends VisitLike = VisitLike,
  Line extends QuantifiedLine = QuantifiedLine,
> {
  favorites: string[];
  history: Visit[];
  cart: Line[];
}

// Reemplaza los ids antiguos por los nuevos en favoritos, historial y carrito
// sin tocar las demás referencias. Si tras el reemplazo un producto queda
// repetido: favoritos e historial conservan la primera aparición (el historial
// va del más reciente al más antiguo) y el carrito suma las cantidades.
export function remapReferences<
  Visit extends VisitLike,
  Line extends QuantifiedLine,
>(
  references: UserReferences<Visit, Line>,
  idMap: ReadonlyMap<string, string>,
): UserReferences<Visit, Line> {
  const resolve = (productId: string): string =>
    idMap.get(productId) ?? productId;

  const favorites = [...new Set(references.favorites.map(resolve))];

  const seenVisits = new Set<string>();
  const history: Visit[] = [];
  for (const visit of references.history) {
    const productId = resolve(visit.productId);
    if (!seenVisits.has(productId)) {
      seenVisits.add(productId);
      history.push({ ...visit, productId });
    }
  }

  const cart: Line[] = [];
  for (const line of references.cart) {
    const productId = resolve(line.productId);
    const existing = cart.find((entry) => entry.productId === productId);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      cart.push({ ...line, productId });
    }
  }

  return { favorites, history, cart };
}

export interface SeedInput {
  products: SeedProduct[];
  sellerPassword: string;
}

export interface SeedSummary {
  sellerCreated: boolean;
  created: number;
  updated: number;
  usersRemapped: number;
}

async function ensureSeller(
  password: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await User.findOne({
    $or: [{ email: SEED_SELLER.email }, { username: SEED_SELLER.username }],
  }).lean();
  if (existing) {
    if (existing.email !== SEED_SELLER.email) {
      throw new Error(
        `El nombre de usuario «${SEED_SELLER.username}» ya pertenece a otra cuenta.`,
      );
    }
    return { id: existing._id.toString(), created: false };
  }

  const seller = await User.create({
    ...SEED_SELLER,
    passwordHash: await hashPassword(password),
  });
  return { id: seller._id.toString(), created: true };
}

async function remapUserReferences(
  idMap: ReadonlyMap<string, string>,
): Promise<number> {
  const oldIds = [...idMap.keys()];
  const users = await User.find({
    $or: [
      { favorites: { $in: oldIds } },
      { "history.productId": { $in: oldIds } },
      { "cart.productId": { $in: oldIds } },
    ],
  }).lean();

  for (const user of users) {
    const { favorites, history, cart } = remapReferences(
      {
        favorites: user.favorites,
        history: user.history,
        cart: user.cart,
      },
      idMap,
    );
    await User.updateOne({ _id: user._id }, { $set: { favorites, history, cart } });
  }
  return users.length;
}

// Carga los productos del catálogo original a MongoDB con el vendedor de
// prueba y conserva sus imágenes. Usa la conexión activa de Mongoose (quien
// llama conecta y desconecta). Es idempotente: el upsert por `{ seller, name }`
// evita duplicados y los ids antiguos solo se remapean mientras existan.
export async function seedProducts(input: SeedInput): Promise<SeedSummary> {
  const seller = await ensureSeller(input.sellerPassword);

  const idMap = new Map<string, string>();
  let created = 0;
  let updated = 0;
  // Se crean del último al primero: el listado público va del más reciente al
  // más antiguo, así que el primer producto del JSON queda primero (el orden
  // original del catálogo). Si dos se crean en el mismo milisegundo, el `_id`
  // creciente desempata igual.
  for (const seed of [...input.products].reverse()) {
    const filter = { seller: seller.id, name: seed.name };
    const result = await Product.updateOne(
      filter,
      {
        $set: {
          description: seed.description,
          category: seed.category,
          price: seed.price,
          image: seed.image,
          featured: seed.featured,
        },
      },
      { upsert: true, runValidators: true },
    );
    if (result.upsertedCount > 0) {
      created += 1;
    } else {
      updated += 1;
    }
    const stored = await Product.findOne(filter, { _id: 1 }).lean();
    if (!stored) {
      throw new Error(`No se pudo guardar el producto «${seed.name}».`);
    }
    idMap.set(seed.id, stored._id.toString());
  }

  const usersRemapped = await remapUserReferences(idMap);
  return { sellerCreated: seller.created, created, updated, usersRemapped };
}
