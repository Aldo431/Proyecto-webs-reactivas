import { cartItemsSchema, type CartItem } from "./cartTypes.ts";
import type { Product } from "./productParse.ts";

export const CART_STORAGE_KEY = "cart";

let inMemoryFallback: CartItem[] | null = null;

function readStoredText(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadCartFromStorage(products: Product[]): CartItem[] {
  let raw: string | null = null;
  try {
    raw = readStoredText();
  } catch {
    return inMemoryFallback ?? [];
  }
  if (raw === null) {
    // localStorage may be unavailable and readStoredText already swallowed;
    // prefer the in-memory fallback when nothing was persisted.
    return inMemoryFallback ?? [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const result = cartItemsSchema.safeParse(parsed);
  if (!result.success) return [];
  const revalidated: CartItem[] = [];
  for (const stored of result.data) {
    const product = products.find((entry) => entry.id === stored.productId);
    if (product === undefined) continue;
    revalidated.push({
      productId: stored.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: stored.quantity,
    });
  }
  return revalidated;
}

export function saveCartToStorage(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    inMemoryFallback = [...items];
  } catch {
    inMemoryFallback = [...items];
  }
}

export function clearInMemoryFallbackForTests(): void {
  inMemoryFallback = null;
}
