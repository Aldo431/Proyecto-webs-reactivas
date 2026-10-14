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
