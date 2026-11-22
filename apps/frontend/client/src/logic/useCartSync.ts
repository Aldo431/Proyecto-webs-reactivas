import { useEffect, useRef } from "react";
import {
  loadSyncedSnapshot,
  saveCartToStorage,
  saveSyncedSnapshot,
} from "./cartStorage.ts";
import {
  areCartItemsEqual,
  areCartLinesEqual,
  mergeWithDelta,
  refreshCartItems,
  subtractSnapshot,
  toCartLines,
} from "./cartSync.ts";
import { fetchProductsByIds } from "./productApi.ts";
import type { Product } from "./productParse.ts";
import { fetchProfile, replaceCart } from "./profileApi.ts";
import { useAuthStore } from "../stores/authStore.ts";
import { useCartStore } from "../stores/cartStore.ts";

// Productos vigentes para los ids dados (spec 008, RF-15); null si la API no
// responde, para no descartar líneas ni subir un carrito recortado.
async function fetchCatalogFor(ids: string[]): Promise<Product[] | null> {
  const result = await fetchProductsByIds(ids);
  return result.ok ? result.products : null;
}

export const SYNC_ERROR_MESSAGE =
  "No se pudo sincronizar el carrito con tu cuenta. Se reintentará en el próximo cambio.";

export const MERGE_NOTICE_MESSAGE =
  "Combinamos el carrito de tu visita con el de tu cuenta sumando las cantidades.";

// Sincroniza el store del carrito con localStorage y con la cuenta (specs 006
// RF-12/13, 008 RF-15, 015 RF-3). Se monta una sola vez (<CartSync />): lee
// la sesión y el carrito desde los stores de Zustand y escribe con sus
// setters. Las reglas de fusión viven en las funciones puras de cartSync.ts.
export function useCartSync(): void {
  const authState = useAuthStore((store) => store.state);
  const items = useCartStore((store) => store.items);
  const { setItems, setMergeNotice, setSyncError } = useCartStore.getState();

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
          const showNotice = merged && !areCartItemsEqual(next, snapshot);
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
    // Los setters del store de Zustand son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, userId]);
}
