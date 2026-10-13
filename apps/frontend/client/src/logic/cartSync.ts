import type { CartLine } from "@tiendadcc/utils";
import type { CartItem } from "./cartTypes.ts";
import type { Product } from "./productParse.ts";

export interface MergeResult {
  items: CartItem[];
  merged: boolean;
}

function isValidQuantity(quantity: unknown): quantity is number {
  return (
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

export function toCartLines(items: CartItem[]): CartLine[] {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
}

// Suma cantidades por productId descartando líneas inválidas. El orden es
// determinista: primero las líneas base (cuenta) y luego las agregadas.
function sumLines(base: CartLine[], added: CartLine[]): CartLine[] {
  const quantities = new Map<string, number>();
  for (const line of [...base, ...added]) {
    if (
      line.productId.trim().length === 0 ||
      !isValidQuantity(line.quantity)
    ) {
      continue;
    }
    quantities.set(
      line.productId,
      (quantities.get(line.productId) ?? 0) + line.quantity,
    );
  }
  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

// Resuelve líneas contra el catálogo igual que al cargar de localStorage
// (004, RF-7): los ids inexistentes se descartan y name/price/image se toman
// del catálogo.
function resolveLines(lines: CartLine[], catalog: Product[]): CartItem[] {
  const items: CartItem[] = [];
  for (const line of lines) {
    const product = catalog.find((entry) => entry.id === line.productId);
    if (product === undefined) {
      continue;
    }
    items.push({
      productId: line.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: line.quantity,
    });
  }
  return items;
}

// Fusiona el carrito invitado (local) con el de la cuenta sumando cantidades
// por productId (spec 006, RF-12, primera versión).
export function mergeCarts(
  localItems: CartItem[],
  serverLines: CartLine[],
  catalog: Product[],
): MergeResult {
  const items = resolveLines(
    sumLines(serverLines, toCartLines(localItems)),
    catalog,
  );
  return {
    items,
    merged: localItems.length > 0 && serverLines.length > 0,
  };
}

// Calcula lo agregado como invitado: cantidades locales menos la huella
// sincronizada de la cuenta, con mínimo cero por producto (spec 006, RF-12).
// Re-login con todo sincronizado → delta vacío (sin duplicación).
export function subtractSnapshot(
  localItems: CartItem[],
  snapshot: CartLine[],
): CartLine[] {
  const synced = new Map(
    snapshot.map((line) => [line.productId, line.quantity]),
  );
  const delta: CartLine[] = [];
  for (const item of localItems) {
    if (!isValidQuantity(item.quantity)) {
      continue;
    }
    const rest = item.quantity - (synced.get(item.productId) ?? 0);
    if (rest > 0) {
      delta.push({ productId: item.productId, quantity: rest });
    }
  }
  return delta;
}

// Fusiona cuenta más delta (spec 006, RF-12): `merged` es true solo cuando
// ambos son no vacíos, para decidir el aviso en español.
export function mergeWithDelta(
  delta: CartLine[],
  serverLines: CartLine[],
  catalog: Product[],
): MergeResult {
  const items = resolveLines(sumLines(serverLines, delta), catalog);
  return {
    items,
    merged: delta.length > 0 && serverLines.length > 0,
  };
}

// Compara dos carritos por contenido (productId → quantity), sin importar el
// orden: evita mostrar el aviso de fusión cuando nada cambió.
export function areCartItemsEqual(
  first: CartItem[],
  second: CartItem[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }
  const quantities = new Map(
    second.map((item) => [item.productId, item.quantity]),
  );
  return first.every(
    (item) => quantities.get(item.productId) === item.quantity,
  );
}

// Igual que areCartItemsEqual pero sobre líneas { productId, quantity }.
export function areCartLinesEqual(
  first: CartLine[],
  second: CartLine[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }
  const quantities = new Map(
    second.map((line) => [line.productId, line.quantity]),
  );
  return first.every(
    (line) => quantities.get(line.productId) === line.quantity,
  );
}
