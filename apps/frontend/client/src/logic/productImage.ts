import { apiBaseUrl } from "./env.ts";

// Las imágenes subidas por usuarios se sirven desde la API
// (`/api/products/<id>/image?v=…`); las del seed son rutas del sitio
// (`/images/…`). Solo las primeras necesitan la URL base del backend cuando
// el frontend se sirve desde otro origen (spec 008, RF-13).
export function resolveImageUrl(
  image: string,
  apiBase: string = apiBaseUrl,
): string {
  if (!image.startsWith("/api/")) {
    return image;
  }
  return `${apiBase.replace(/\/+$/, "")}${image}`;
}
