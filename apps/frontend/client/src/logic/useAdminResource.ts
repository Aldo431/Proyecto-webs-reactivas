import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminResult } from "./adminApi.ts";

export type AdminResourceState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; httpStatus: number | null }
  | { status: "ready"; data: T; refreshing: boolean };

export interface AdminResourceOptions<T> {
  /**
   * Clave de la consulta que realmente representan los datos cargados. Si la
   * API ajustó la página, devuelve la clave de la página ajustada para que el
   * cambio de URL posterior no repita la solicitud.
   */
  settledKey?: (data: T) => string;
  /** Se llama una vez por carga exitosa, con los datos ya publicados. */
  onLoaded?: (data: T) => void;
}

export interface AdminResourceHook<T> {
  state: AdminResourceState<T>;
  /** Vuelve a pedir los datos; los actuales siguen visibles (`refreshing`). */
  reload: () => void;
  /** Reemplaza los datos cargados sin pedirlos de nuevo (p. ej. una fila). */
  update: (change: (data: T) => T) => void;
}

// Carga genérica del panel: estado `loading | error | ready`, recarga y
// descarte de respuestas atrasadas. `key` identifica la consulta; mientras no
// cambie, no se vuelve a pedir. Un cambio de `key` pasa a `loading`; `reload`
// conserva los datos visibles mientras responde.
export function useAdminResource<T>(
  key: string,
  load: () => Promise<AdminResult<T>>,
  options: AdminResourceOptions<T> = {},
): AdminResourceHook<T> {
  const [state, setState] = useState<AdminResourceState<T>>({
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  const optionsRef = useRef(options);
  loadRef.current = load;
  optionsRef.current = options;
  const loadedRef = useRef<{ key: string; attempt: number } | null>(null);
  const softReloadRef = useRef(false);

  useEffect(() => {
    if (
      loadedRef.current !== null &&
      loadedRef.current.key === key &&
      loadedRef.current.attempt === attempt
    ) {
      return;
    }
    let isCurrent = true;
    const soft = softReloadRef.current;
    softReloadRef.current = false;
    setState((previous) =>
      soft && previous.status === "ready"
        ? { ...previous, refreshing: true }
        : { status: "loading" },
    );

    function fail(message: string, httpStatus: number | null) {
      loadedRef.current = null;
      setState({ status: "error", message, httpStatus });
    }

    loadRef.current().then(
      (result) => {
        if (!isCurrent) return;
        if (!result.ok) {
          fail(result.message, result.status);
          return;
        }
        loadedRef.current = {
          key: optionsRef.current.settledKey?.(result.data) ?? key,
          attempt,
        };
        setState({ status: "ready", data: result.data, refreshing: false });
        optionsRef.current.onLoaded?.(result.data);
      },
      () => {
        if (!isCurrent) return;
        fail("No se pudo conectar con el servidor. Inténtalo de nuevo.", null);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => {
    softReloadRef.current = true;
    setAttempt((previous) => previous + 1);
  }, []);

  const update = useCallback((change: (data: T) => T) => {
    setState((previous) =>
      previous.status === "ready"
        ? { ...previous, data: change(previous.data) }
        : previous,
    );
  }, []);

  return { state, reload, update };
}
