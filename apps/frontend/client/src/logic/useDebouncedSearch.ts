import { useEffect, useRef, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "./catalogQuery.ts";

// Texto de búsqueda de una lista del panel con retardo: lo escrito se muestra
// al instante y solo se "confirma" (para ir a la URL y pedir datos) cuando el
// usuario deja de escribir. Si el texto confirmado cambia desde fuera (atrás
// del navegador, otro filtro), el campo lo refleja. `committed` y `onCommit`
// pueden cambiar de identidad en cada render.
export function useDebouncedSearch(
  committed: string,
  onCommit: (text: string) => void,
  delayMs: number = SEARCH_DEBOUNCE_MS,
): [string, (text: string) => void] {
  const [text, setText] = useState<string>(committed);
  const committedRef = useRef(committed);
  const onCommitRef = useRef(onCommit);
  committedRef.current = committed;
  onCommitRef.current = onCommit;

  useEffect(() => {
    setText(committed);
  }, [committed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== committedRef.current) {
        onCommitRef.current(next);
      }
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [text, delayMs]);

  return [text, setText];
}
