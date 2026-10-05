import type { CartItem } from "./cartTypes.ts";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

export function addItemToCart(items: CartItem[], product: CartProduct): CartItem[] {
  const existing = items.find((item) => item.productId === product.id);
  if (existing !== undefined) {
    return items.map((item) =>
      item.productId === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    );
  }
  return [
    ...items,
    {
      productId: product.id,
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
): CartItem[] {
  if (quantity <= 0) {
    return removeItemFromCart(items, productId);
  }
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
}

export function removeItemFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}

export function clearCart(): CartItem[] {
  return [];
}
