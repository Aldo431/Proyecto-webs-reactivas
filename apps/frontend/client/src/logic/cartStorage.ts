import { cartLineSchema, type CartLine } from "@tiendadcc/utils";
import { z } from "zod";
import { cartItemsSchema, type CartItem } from "./cartTypes.ts";

export const CART_STORAGE_KEY = "cart";

// Huella sincronizada por cuenta (spec 006, RF-12): último carrito que se
// sabe igual al de la cuenta. Vive separada por usuario y sobrevive al logout
// para que el re-login no vuelva a sumar lo ya sincronizado.
const SYNCED_SNAPSHOT_PREFIX = "cart-synced:";

function snapshotKey(userId: string): string {
  return `${SYNCED_SNAPSHOT_PREFIX}${userId}`;
}

export function loadSyncedSnapshot(userId: string): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(snapshotKey(userId));
  } catch {
    return [];
  }
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  // La huella guarda líneas { productId, quantity }: se valida su forma sin
  // revalidar contra el catálogo (los ids se resuelven al fusionar).
  const lines = z.array(cartLineSchema).safeParse(parsed);
  if (!lines.success) {
    return [];
  }
  return lines.data;
}

export function saveSyncedSnapshot(userId: string, items: CartItem[]): void {
  try {
    window.localStorage.setItem(
      snapshotKey(userId),
      JSON.stringify(
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      ),
    );
  } catch {
    // Sin almacenamiento: la próxima fusión usará delta completo.
  }
}

let inMemoryFallback: CartItem[] | null = null;

function readStoredText(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Reads the persisted cart validating only its shape: the stored items are
// shown right away and refreshed against the API afterwards (spec 008, RF-15).
export function loadCartFromStorage(): CartItem[] {
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
  return result.success ? result.data : [];
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
