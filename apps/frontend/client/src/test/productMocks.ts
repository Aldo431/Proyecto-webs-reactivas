import type { Product } from "@tiendadcc/utils";
import { makeProduct } from "../logic/productFixtures.ts";
import { jsonResponse, type FetchRoutes } from "./authMocks.ts";

// The three example products as the API returns them (spec 008 seed).
export const exampleProducts: Product[] = [
  makeProduct({
    id: "taza-dcc",
    name: "Taza DCC",
    category: "Tazas",
    price: 6000,
    image: "/images/taza-dcc.png",
    description: "Taza de cerámica con el logo del DCC.",
  }),
  makeProduct({
    id: "polera-dcc",
    name: "Polera DCC",
    category: "Poleras",
    price: 12000,
    image: "/images/polera-dcc.png",
    description: "Polera de algodón con estampado del DCC.",
  }),
  makeProduct({
    id: "sticker-dcc",
    name: "Sticker DCC",
    category: "Stickers",
    price: 1500,
    image: "/images/sticker-dcc.png",
    description: "Stickers con el logo del DCC.",
  }),
];

// Routes for `stubAuthFetch` that answer the product reads: the whole catalog,
// the featured selection and one product per id. Unknown ids are not routed,
// so tests script a 404 (or an error) explicitly.
export function productRoutes(
  products: Product[] = exampleProducts,
): FetchRoutes {
  const routes: FetchRoutes = {
    "/api/products": () => jsonResponse(200, products),
    "/api/products?featured=true": () =>
      jsonResponse(
        200,
        products.filter((product) => product.featured),
      ),
  };
  for (const product of products) {
    routes[`/api/products/${encodeURIComponent(product.id)}`] = () =>
      jsonResponse(200, product);
  }
  return routes;
}

// Answers any other `GET /api/products?*` catalog page like the API: exact
// category, case-insensitive name substring, min/max, the four orders and
// pages of 9 with totals. Returns null for other requests (and for the
// `featured`/`ids` queries owned by the exact routes above), so hand-written
// `fetch` stubs can fall through.
export function catalogPageResponse(
  method: string,
  url: string,
  products: Product[] = exampleProducts,
): Response | null {
  if (method !== "GET" || !url.startsWith("/api/products?")) {
    return null;
  }
  if (url.includes("featured=") || url.includes("ids=")) {
    return null;
  }
  const query = new URL(url, "http://test").searchParams;
  let list = [...products];
  const categoria = query.get("categoria");
  if (categoria !== null) {
    list = list.filter((product) => product.category === categoria);
  }
  const q = query.get("q");
  if (q !== null && q !== "") {
    list = list.filter((product) =>
      product.name.toLowerCase().includes(q.toLowerCase()),
    );
  }
  const min = query.get("min");
  if (min !== null) {
    list = list.filter((product) => product.price >= Number(min));
  }
  const max = query.get("max");
  if (max !== null) {
    list = list.filter((product) => product.price <= Number(max));
  }
  const orden = query.get("orden") ?? "recientes";
  if (orden === "precio-menor") {
    list.sort((a, b) => a.price - b.price);
  } else if (orden === "precio-mayor") {
    list.sort((a, b) => b.price - a.price);
  } else if (orden === "nombre") {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  const pagina = Number(query.get("pagina") ?? "1");
  const porPagina = 9;
  const total = list.length;
  return jsonResponse(200, {
    products: list.slice((pagina - 1) * porPagina, pagina * porPagina),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  });
}
// Answers `GET /api/products?ids=a,b` like the API: the known products among
// the requested ids, in the requested order (unknown ids are left out). Returns
// null for any other request, so hand-written `fetch` stubs can fall through.
export function productsByIdsResponse(
  method: string,
  url: string,
  products: Product[] = exampleProducts,
): Response | null {
  const prefix = "/api/products?ids=";
  if (method !== "GET" || !url.startsWith(prefix)) {
    return null;
  }
  const ids = url.slice(prefix.length).split(",").map(decodeURIComponent);
  const found = ids.flatMap((id) => {
    const product = products.find((entry) => entry.id === id);
    return product === undefined ? [] : [product];
  });
  return jsonResponse(200, found);
}

export function notFoundRoute(): () => Response {
  return () => jsonResponse(404, { message: "Producto no encontrado." });
}
