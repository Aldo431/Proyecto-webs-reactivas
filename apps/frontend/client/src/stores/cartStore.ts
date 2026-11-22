import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  addItemToCart,
  clearCart as clearCartItems,
  removeItemFromCart,
  updateItemQuantity,
  type CartProduct,
} from "../logic/cartOperations.ts";
import {
  calculateCartTotal,
  calculateTotalQuantity,
} from "../logic/cartCalculations.ts";
import { loadCartFromStorage } from "../logic/cartStorage.ts";
import type { CartItem } from "../logic/cartTypes.ts";

type ItemsUpdate = CartItem[] | ((previous: CartItem[]) => CartItem[]);

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  mergeNotice: string | null;
  syncError: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: CartProduct) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  dismissMergeNotice: () => void;
  // Setters internos para la sincronización con la cuenta (logic/useCartSync).
  setItems: (update: ItemsUpdate) => void;
  setMergeNotice: (notice: string | null) => void;
  setSyncError: (error: string | null) => void;
}

export interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  totalCount: number;
  totalAmount: number;
  mergeNotice: string | null;
  syncError: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: CartProduct) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  dismissMergeNotice: () => void;
}

function initialCartState(): Pick<
  CartStore,
  "items" | "isOpen" | "mergeNotice" | "syncError"
> {
  return {
    items: loadCartFromStorage(),
    isOpen: false,
    mergeNotice: null,
    syncError: null,
  };
}

// Store del carrito, entidad principal (spec 015, RF-2). Parte con lo guardado
// en localStorage; las reglas de negocio viven en las funciones puras de
// logic/ y la sincronización con la cuenta en logic/useCartSync.ts.
export const useCartStore = create<CartStore>()((set) => ({
  ...initialCartState(),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((store) => ({ isOpen: !store.isOpen })),

  addItem: (product) =>
    set((store) => ({ items: addItemToCart(store.items, product) })),

  updateQuantity: (productId, quantity, variantId) =>
    set((store) => ({
      items: updateItemQuantity(store.items, productId, quantity, variantId),
    })),

  removeItem: (productId, variantId) =>
    set((store) => ({
      items: removeItemFromCart(store.items, productId, variantId),
    })),

  clearCart: () => set({ items: clearCartItems() }),

  dismissMergeNotice: () => set({ mergeNotice: null }),

  setItems: (update) =>
    set((store) => ({
      items: typeof update === "function" ? update(store.items) : update,
    })),

  setMergeNotice: (notice) => set({ mergeNotice: notice }),

  setSyncError: (error) => set({ syncError: error }),
}));

// Relee localStorage y limpia el estado de UI (equivale a cargar la página);
// lo usan los tests antes de montar.
export function resetCartStore(): void {
  useCartStore.setState(initialCartState());
}

export const selectTotalCount = (store: CartStore): number =>
  calculateTotalQuantity(store.items);

export const selectTotalAmount = (store: CartStore): number =>
  calculateCartTotal(store.items);

// API de consumo compatible con el antiguo CartContext (spec 015, RF-4).
export function useCart(): CartContextValue {
  const store = useCartStore(
    useShallow((current) => ({
      items: current.items,
      isOpen: current.isOpen,
      mergeNotice: current.mergeNotice,
      syncError: current.syncError,
      openCart: current.openCart,
      closeCart: current.closeCart,
      toggleCart: current.toggleCart,
      addItem: current.addItem,
      updateQuantity: current.updateQuantity,
      removeItem: current.removeItem,
      clearCart: current.clearCart,
      dismissMergeNotice: current.dismissMergeNotice,
    })),
  );
  return useMemo(
    () => ({
      ...store,
      totalCount: calculateTotalQuantity(store.items),
      totalAmount: calculateCartTotal(store.items),
    }),
    [store],
  );
}
