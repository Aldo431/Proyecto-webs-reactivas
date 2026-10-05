import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addItemToCart,
  clearCart as clearCartItems,
  removeItemFromCart,
  updateItemQuantity,
  type CartProduct,
} from "../logic/cartOperations.ts";
import { calculateCartTotal, calculateTotalQuantity } from "../logic/cartCalculations.ts";
import { loadCartFromStorage, saveCartToStorage } from "../logic/cartStorage.ts";
import type { CartItem } from "../logic/cartTypes.ts";
import productsJson from "../data/products.json";
import { parseProducts } from "../logic/productParse.ts";

const productCatalog = parseProducts(productsJson);

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  totalCount: number;
  totalAmount: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: CartProduct) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(() =>
    loadCartFromStorage(productCatalog),
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const openCart = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const toggleCart = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, []);

  const addItem = useCallback((product: CartProduct): void => {
    setItems((previous) => addItemToCart(previous, product));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number): void => {
      setItems((previous) => updateItemQuantity(previous, productId, quantity));
    },
    [],
  );

  const removeItem = useCallback((productId: string): void => {
    setItems((previous) => removeItemFromCart(previous, productId));
  }, []);

  const clearCart = useCallback((): void => {
    setItems(clearCartItems());
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isOpen,
      totalCount: calculateTotalQuantity(items),
      totalAmount: calculateCartTotal(items),
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
