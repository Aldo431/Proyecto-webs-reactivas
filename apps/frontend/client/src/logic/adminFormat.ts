import type { AdminActivity, AdminOverview } from "@tiendadcc/utils";

// Formateo del panel de administración (spec 013, RF-10 a RF-13). Funciones
// puras: sin React ni red, con `now` inyectable para que los tests sean
// deterministas.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const relativeFormat = new Intl.RelativeTimeFormat("es", {
  numeric: "auto",
  style: "short",
});

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "hace 2 h", "ayer", "hace 3 d", "ahora". Una fecha futura (reloj
// desfasado) se trata como "ahora"; una fecha inválida devuelve "".
export function formatRelativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const elapsed = Math.max(0, now.getTime() - then);
  if (elapsed < MINUTE_MS) {
    return relativeFormat.format(0, "second");
  }
  if (elapsed < HOUR_MS) {
    return relativeFormat.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  }
  if (elapsed < DAY_MS) {
    return relativeFormat.format(-Math.floor(elapsed / HOUR_MS), "hour");
  }
  return relativeFormat.format(-Math.floor(elapsed / DAY_MS), "day");
}

// Fecha corta en es-CL ("10 nov 2026"); "" si la fecha es inválida.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

// Promedio con una coma decimal ("4,2"), o "—" sin reseñas.
export function formatRating(average: number | null): string {
  if (average === null) {
    return "—";
  }
  return (Math.round(average * 10) / 10).toFixed(1).replace(".", ",");
}

export interface ActivityDescription {
  /** `@usuario`, que la interfaz muestra en `font-mono`. */
  user: string;
  text: string;
}

function starsText(rating: number): string {
  return rating === 1 ? "1 estrella" : `${rating} estrellas`;
}

export function describeActivity(event: AdminActivity): ActivityDescription {
  const user = `@${event.user.username}`;
  switch (event.type) {
    case "user_registered":
      return { user, text: "creó su cuenta" };
    case "product_published":
      return { user, text: `publicó «${event.product.name}»` };
    case "review_created":
      return {
        user,
        text: `dejó una reseña de ${starsText(event.rating)} en «${event.product.name}»`,
      };
  }
}

export interface CategoryBar {
  category: string;
  count: number;
  /** Ancho en %, proporcional a la categoría con más productos. */
  widthPercent: number;
}

export interface CategoryBars {
  bars: CategoryBar[];
  /** Todos los valores, para el `aria-label` del gráfico (`role="img"`). */
  ariaLabel: string;
}

export function categoryBars(
  byCategory: AdminOverview["products"]["byCategory"],
): CategoryBars {
  const max = Math.max(0, ...byCategory.map((entry) => entry.count));
  const bars = byCategory.map((entry) => ({
    category: entry.category,
    count: entry.count,
    widthPercent: max === 0 ? 0 : Math.round((entry.count / max) * 100),
  }));
  const values = byCategory
    .map((entry) => `${entry.category} ${entry.count}`)
    .join(", ");
  return { bars, ariaLabel: `Productos por categoría: ${values}.` };
}

// "Mostrando 21–40 de 57" (la última página termina en el total).
export function formatRange(
  pagina: number,
  porPagina: number,
  total: number,
): string {
  if (total === 0) {
    return "Mostrando 0 de 0";
  }
  const first = (pagina - 1) * porPagina + 1;
  const last = Math.min(pagina * porPagina, total);
  return `Mostrando ${first}–${last} de ${total}`;
}

// Una reseña de 1 o 2 estrellas se considera baja (spec 013, RF-1, RF-13).
const LOW_RATING_MAX = 2;

export function isLowRating(rating: number): boolean {
  return rating <= LOW_RATING_MAX;
}

export interface StatCardData {
  label: string;
  value: string;
  note: string;
  /** Las notas "+N" se resaltan en verde solo si N > 0 (RF-10). */
  highlightNote: boolean;
}

function weekNote(count: number): string {
  return `+${count} esta semana`;
}

// Los cuatro indicadores del Resumen (RF-10).
export function overviewStats(overview: AdminOverview): StatCardData[] {
  const { users, products, reviews } = overview;
  const featured = products.featured;
  return [
    {
      label: "Usuarios registrados",
      value: String(users.total),
      note: weekNote(users.newLast7Days),
      highlightNote: users.newLast7Days > 0,
    },
    {
      label: "Productos publicados",
      value: String(products.total),
      note: featured === 1 ? "1 destacado" : `${featured} destacados`,
      highlightNote: false,
    },
    {
      label: "Reseñas",
      value: String(reviews.total),
      note: weekNote(reviews.newLast7Days),
      highlightNote: reviews.newLast7Days > 0,
    },
    {
      label: "Calificación promedio",
      value: formatRating(reviews.averageRating),
      note:
        reviews.averageRating === null ? "sin reseñas aún" : "de 5 estrellas",
      highlightNote: false,
    },
  ];
}
