import type { CartItem } from "./cartTypes.ts";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  variantId?: string;
  variantName?: string;
  stock?: number;
}

export function addItemToCart(items: CartItem[], product: CartProduct): CartItem[] {
  const existing = items.find(
    (item) =>
      item.productId === product.id && item.variantId === product.variantId,
  );
  if (existing !== undefined) {
    return items.map((item) =>
      item.productId === product.id && item.variantId === product.variantId
        ? {
            ...item,
            quantity: Math.min(
              item.quantity + 1,
              product.stock ?? Number.MAX_SAFE_INTEGER,
            ),
          }
        : item,
    );
  }
  return [
    ...items,
    {
      productId: product.id,
      ...(product.variantId === undefined
        ? {}
        : {
            variantId: product.variantId,
            variantName: product.variantName,
            stock: product.stock,
          }),
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    },
  ];
}

export function updateItemQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  variantId?: string,
): CartItem[] {
  if (quantity <= 0) {
    return removeItemFromCart(items, productId, variantId);
  }
  return items.map((item) =>
    item.productId === productId && item.variantId === variantId
      ? { ...item, quantity: Math.min(quantity, item.stock ?? quantity) }
      : item,
  );
}

export function removeItemFromCart(
  items: CartItem[],
  productId: string,
  variantId?: string,
): CartItem[] {
  return items.filter(
    (item) => item.productId !== productId || item.variantId !== variantId,
  );
}

export function clearCart(): CartItem[] {
  return [];
}
