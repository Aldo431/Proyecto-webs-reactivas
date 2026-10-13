// Tamaño de página del historial en /perfil (spec 006, RF-8): constante
// configurable del frontend, no viaja al backend.
export const HISTORY_PAGE_SIZE = 10;

export interface Page<T> {
  pageItems: T[];
  page: number;
  totalPages: number;
}

// Recorta la página pedida; fuera de rango se ajusta a la última válida
// (mínimo 1 aunque no haya elementos).
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}
