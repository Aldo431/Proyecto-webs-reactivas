import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  loadCartFromStorage,
  loadSyncedSnapshot,
  saveCartToStorage,
  saveSyncedSnapshot,
} from "../logic/cartStorage.ts";
import {
  areCartItemsEqual,
  areCartLinesEqual,
  mergeWithDelta,
  refreshCartItems,
  subtractSnapshot,
  toCartLines,
} from "../logic/cartSync.ts";
import type { CartItem } from "../logic/cartTypes.ts";
import { fetchProductsByIds } from "../logic/productApi.ts";
import { fetchProfile, replaceCart } from "../logic/profileApi.ts";
import type { Product } from "../logic/productParse.ts";
import { useAuth } from "./AuthContext.tsx";

// Productos vigentes para los ids dados (spec 008, RF-15); null si la API no
// responde, para no descartar líneas ni subir un carrito recortado.
async function fetchCatalogFor(ids: string[]): Promise<Product[] | null> {
  const result = await fetchProductsByIds(ids);
  return result.ok ? result.products : null;
}

const SYNC_ERROR_MESSAGE =
  "No se pudo sincronizar el carrito con tu cuenta. Se reintentará en el próximo cambio.";

const MERGE_NOTICE_MESSAGE =
  "Combinamos el carrito de tu visita con el de tu cuenta sumando las cantidades.";

interface CartContextValue {
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
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  dismissMergeNotice: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { state: authState } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() =>
    loadCartFromStorage(),
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Usuario para el que ya se sincronizó en esta sesión (una vez por login).
  const syncedUserRef = useRef<string | null>(null);
  const syncingRef = useRef<boolean>(false);
  // Estado de sesión previo: distingue el login real (anónimo → autenticado,
  // única vez que se fusiona) de la restauración al recargar.
  const prevStatusRef = useRef(authState.status);
  // Omite el persistido automático tras un cambio proveniente de la propia
  // sincronización (p. ej. la adopción nunca debe generar un PUT).
  const skipPersistRef = useRef<boolean>(false);

  const userId =
    authState.status === "authenticated" ? authState.user.id : null;

  // Al montar, el carrito guardado se muestra de inmediato y luego se
  // refresca contra la API: nombre/precio/imagen vigentes y fuera las líneas
  // cuyo producto ya no existe (spec 008, RF-15). Si la API falla no se
  // descarta nada.
  useEffect(() => {
    const ids = items.map((item) => item.productId);
    if (ids.length === 0) {
      return;
    }
    const checkedIds = new Set(ids);
    let cancelled = false;
    void (async () => {
      const products = await fetchCatalogFor(ids);
      if (cancelled || products === null) {
        return;
      }
      setItems((previous) => refreshCartItems(previous, products, checkedIds));
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar, con el carrito que había en el almacenamiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronización con la cuenta (RF-12): solo se fusiona en la transición
  // anónimo → autenticado y únicamente el delta sobre la huella sincronizada,
  // por lo que recargas y re-logins no duplican. La restauración de sesión
  // nunca fusiona ni avisa.
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = authState.status;
    if (authState.status !== "authenticated" || userId === null) {
      syncedUserRef.current = null;
      setMergeNotice(null);
      setSyncError(null);
      return;
    }
    if (syncedUserRef.current === userId || syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    const isLoginTransition = prevStatus === "anonymous";
    const snapshot = items;
    const currentUserId = userId;
    let cancelled = false;

    void (async () => {
      const profile = await fetchProfile();
      if (cancelled) {
        syncingRef.current = false;
        return;
      }
      const serverLines = profile?.cart ?? [];
      // Los productos se resuelven contra la API para las líneas locales y de
      // la cuenta; sin respuesta no se fusiona ni se sube nada y se reintenta
      // en la próxima transición o carga (RF-15).
      const catalog = await fetchCatalogFor([
        ...snapshot.map((item) => item.productId),
        ...serverLines.map((line) => line.productId),
      ]);
      if (cancelled || catalog === null) {
        syncingRef.current = false;
        return;
      }

      if (isLoginTransition) {
        const delta = subtractSnapshot(
          snapshot,
          loadSyncedSnapshot(currentUserId),
        );
        const { items: next, merged } = mergeWithDelta(
          delta,
          serverLines,
          catalog,
        );
        if (delta.length === 0) {
          // Adopción (local vacío o ya sincronizado): nunca PUT ni aviso.
          if (!areCartItemsEqual(next, snapshot)) {
            skipPersistRef.current = true;
            setItems(next);
          }
          saveSyncedSnapshot(currentUserId, next);
        } else {
          // Novedades invitadas: fusionar o subir, con aviso solo ante
          // fusión real con la cuenta.
          const showNotice =
            merged && !areCartItemsEqual(next, snapshot);
          if (!areCartItemsEqual(next, snapshot)) {
            skipPersistRef.current = true;
            setItems(next);
          }
          if (showNotice) {
            setMergeNotice(MERGE_NOTICE_MESSAGE);
          }
          const result = await replaceCart(toCartLines(next));
          if (!cancelled) {
            if (result.ok) {
              setSyncError(null);
              saveSyncedSnapshot(currentUserId, next);
            } else {
              setSyncError(SYNC_ERROR_MESSAGE);
            }
          }
        }
      } else {
        // Restauración al recargar: nunca fusiona ni avisa.
        const { items: resolvedServer } = mergeWithDelta(
          [],
          serverLines,
          catalog,
        );
        if (snapshot.length === 0) {
          if (serverLines.length > 0) {
            skipPersistRef.current = true;
            setItems(resolvedServer);
          }
          saveSyncedSnapshot(currentUserId, resolvedServer);
        } else if (
          !areCartLinesEqual(
            toCartLines(snapshot),
            loadSyncedSnapshot(currentUserId),
          )
        ) {
          // Cambios locales no sincronizados: convergencia silenciosa.
          const result = await replaceCart(toCartLines(snapshot));
          if (!cancelled) {
            if (result.ok) {
              setSyncError(null);
              saveSyncedSnapshot(currentUserId, snapshot);
            } else {
              setSyncError(SYNC_ERROR_MESSAGE);
            }
          }
        }
      }

      if (!cancelled) {
        syncedUserRef.current = currentUserId;
      }
      syncingRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
    // Se sincroniza una vez por sesión con la foto del carrito de ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, userId]);

  // Persistencia local siempre + continua en la cuenta con sesión (RF-13).
  useEffect(() => {
    saveCartToStorage(items);
    if (userId === null || syncedUserRef.current !== userId) {
      return;
    }
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await replaceCart(toCartLines(items));
      if (!cancelled) {
        if (result.ok) {
          setSyncError(null);
          saveSyncedSnapshot(userId, items);
        } else {
          setSyncError(SYNC_ERROR_MESSAGE);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, userId]);

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

  const dismissMergeNotice = useCallback((): void => {
    setMergeNotice(null);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isOpen,
      totalCount: calculateTotalQuantity(items),
      totalAmount: calculateCartTotal(items),
      mergeNotice,
      syncError,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      dismissMergeNotice,
    }),
    [
      items,
      isOpen,
      mergeNotice,
      syncError,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      dismissMergeNotice,
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
