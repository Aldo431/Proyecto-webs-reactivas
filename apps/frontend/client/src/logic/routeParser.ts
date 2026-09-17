export const PRODUCT_ROUTE_PREFIX = "/producto/";

export type Route =
  | { name: "home" }
  | { name: "register" }
  | { name: "login" }
  | { name: "product"; productId: string }
  | { name: "unknown" };

/**
 * A per-route parser: resolves its own path shape or returns `null` when
 * the path belongs to another route. New features (cart, catalog, filters)
 * plug in here as new entries in `routeParsers` with their own specs —
 * `parseRoute` itself never changes.
 */
export type RouteParser = (path: string) => Route | null;

export function parseHomeRoute(path: string): Route | null {
  if (path === "" || path === "/") return { name: "home" };
  return null;
}

export function parseRegisterRoute(path: string): Route | null {
  if (path === "/registro") return { name: "register" };
  return null;
}

export function parseLoginRoute(path: string): Route | null {
  if (path === "/iniciar-sesion") return { name: "login" };
  return null;
}

export function parseProductRoute(path: string): Route | null {
  if (!path.startsWith(PRODUCT_ROUTE_PREFIX)) return null;
  const encodedId = path.slice(PRODUCT_ROUTE_PREFIX.length);
  if (encodedId === "" || encodedId.includes("/")) return null;
  try {
    const productId = decodeURIComponent(encodedId);
    if (productId === "") return null;
    return { name: "product", productId };
  } catch {
    return null;
  }
}

const routeParsers: RouteParser[] = [
  parseHomeRoute,
  parseRegisterRoute,
  parseLoginRoute,
  parseProductRoute,
];

export function buildProductRoute(productId: string): string {
  return `#${PRODUCT_ROUTE_PREFIX}${encodeURIComponent(productId)}`;
}

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "");
  for (const parseSingleRoute of routeParsers) {
    const route = parseSingleRoute(path);
    if (route !== null) return route;
  }
  return { name: "unknown" };
}
