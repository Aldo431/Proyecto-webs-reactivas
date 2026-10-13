// Tamaño de página del historial en /perfil (spec 006, RF-8): constante
// configurable del frontend, no viaja al backend.
export const HISTORY_PAGE_SIZE = 10;

// Tamaño de página de favoritas en /perfil (spec 007, RF-8): grilla de 12.
export const FAVORITES_PAGE_SIZE = 12;

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

const viewedAtFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Etiqueta en español para la fecha de visita del historial (spec 007, RF-9).
// Ante un valor inválido devuelve cadena vacía en vez de lanzar.
export function formatViewedAt(viewedAt: string): string {
  const date = new Date(viewedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return viewedAtFormatter.format(date);
}
