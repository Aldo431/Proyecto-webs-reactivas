import type { CartItem } from "./cartTypes.ts";

export function calculateItemSubtotal(price: number, quantity: number): number {
  return price * quantity;
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function calculateTotalQuantity(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartBadgeText(totalCount: number): string | null {
  if (totalCount <= 0) return null;
  if (totalCount > 99) return "99+";
  return String(totalCount);
}

export function formatPriceCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}
