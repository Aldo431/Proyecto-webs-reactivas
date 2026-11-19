import type { AdminPage } from "@tiendadcc/utils";
import { useCallback, useRef } from "react";
import type { AdminResult } from "./adminApi.ts";
import { useAdminResource, type AdminResourceHook } from "./useAdminResource.ts";

export interface AdminListOptions {
  /**
   * La API ajusta una página que ya no existe a la última (RF-14): tras
   * eliminar el último ítem de una página, se carga la anterior. Se avisa
   * aquí para que la página sincronice `?pagina=` en la URL (con `replace`).
   */
  onPageAdjusted?: (pagina: number) => void;
}

export interface AdminListHook<Item> {
  state: AdminResourceHook<AdminPage<Item>>["state"];
  reload: () => void;
  /** Reemplaza los ítems cargados sin pedirlos otra vez (p. ej. una fila). */
  updateItems: (change: (items: Item[]) => Item[]) => void;
}

// Lista paginada del panel (spec 013, RF-11 a RF-14). `fetcher` es una de las
// funciones de adminApi.ts; la consulta se identifica por su contenido, así
// que no hace falta que `query` tenga una identidad estable.
export function useAdminList<Query extends { pagina: number }, Item>(
  fetcher: (query: Query) => Promise<AdminResult<AdminPage<Item>>>,
  query: Query,
  options: AdminListOptions = {},
): AdminListHook<Item> {
  const queryRef = useRef(query);
  const optionsRef = useRef(options);
  queryRef.current = query;
  optionsRef.current = options;

  const { state, reload, update } = useAdminResource<AdminPage<Item>>(
    JSON.stringify(query),
    () => fetcher(queryRef.current),
    {
      settledKey: (page) =>
        JSON.stringify({ ...queryRef.current, pagina: page.pagina }),
      onLoaded: (page) => {
        if (page.pagina !== queryRef.current.pagina) {
          optionsRef.current.onPageAdjusted?.(page.pagina);
        }
      },
    },
  );

  const updateItems = useCallback(
    (change: (items: Item[]) => Item[]) => {
      update((page) => ({ ...page, items: change(page.items) }));
    },
    [update],
  );

  return { state, reload, updateItems };
}
