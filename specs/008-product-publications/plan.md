# Plan 008 — Publicaciones de productos

Plan de implementación para la spec `008-product-publications`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-21. Cada sección indica qué RF atiende. Las specs 002–007 quedan congeladas: este plan solo toca lo que la 008 declara (nuevo o `modifica 00N/RF-x`).

## 1. Estructura de módulos
*Cubre: RF-1 … RF-21.*

Se trabaja sobre lo construido en 005–007: `@tiendadcc/utils` compartido, `User` con `favorites`/`history`/`cart` como strings, `requireAuth` + `errorHandler` (`HttpError`, ZodError → 400), `AuthContext`, `CartContext` con huella sincronizada, `profileApi.ts` y `useFeaturedProducts`. La lógica vive en servicios del backend y en funciones/hooks puros del frontend, nunca en componentes (§3).

- **Esquemas compartidos** — `utils/src/productSchemas.ts` (nuevo) *(RF-1, RF-2, RF-3, RF-5)*
  - `PRODUCT_CATEGORIES = ["Tazas", "Poleras", "Stickers"] as const`, `productCategorySchema = z.enum(PRODUCT_CATEGORIES)`.
  - `MAX_IMAGE_BYTES = 1_048_576`, `ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]`, `MAX_PRODUCT_PRICE = 10_000_000`, `MAX_IDS_PER_QUERY = 100`.
  - Helpers puros: `parseDataUrl(value)` → `{ mime, base64 } | null`, `base64DecodedBytes(base64)` (longitud × 3/4 − relleno, sin decodificar todo), `hasImageSignature(mime, base64)` (decodifica solo los primeros 12 bytes con un decodificador base64 puro propio, porque `utils/tsconfig.json` no incluye `atob`/`Buffer` en sus tipos).
  - `uploadImageSchema`: string → `superRefine` con mensajes en español en este orden: obligatoria → formato data URL/tipo → base64 válido → tamaño ≤ 1 MB → firma.
  - `productImageSchema`: `uploadImageSchema` | ruta que empieza por `/` | URL `http(s)`.
  - `productSellerSchema = { id, username, displayName }`; `productSchema` público (con `createdAt`/`updatedAt` ISO); `productListSchema = z.array(productSchema)`.
  - `createProductInputSchema = { name, description, category, price, image: uploadImageSchema }` (objeto no estricto: Zod descarta claves desconocidas); `updateProductInputSchema = createProductInputSchema.partial().refine(hay al menos un campo, "No hay cambios para guardar.")`.
  - `productListQuerySchema = { categoria?: productCategorySchema, featured?: "true" | "false" → boolean, ids?: string → string[] (split, trim, dedupe, máx. 100) }`.
  - `index.ts` reexporta todo.

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-3 … RF-12)*
  - `models/Product.ts` (nuevo): esquema con validadores Mongoose de respaldo (los mismos límites que Zod), `seller: { type: ObjectId, ref: "User", required: true, index: true }`, índice `{ createdAt: -1, _id: -1 }`, `timestamps`. Método `toPublicJSON(seller)` y función `publicImageUrl(doc)` que convierte data URL → `/api/products/<id>/image?v=<updatedAt.getTime()>` *(RF-1, RF-5)*.
  - `services/productService.ts` (nuevo): `listProducts(query)`, `listProductsBySeller(userId)`, `findPublicProduct(id)`, `createProduct(userId, input)`, `updateProduct(userId, id, input)`, `deleteProduct(userId, id)`, `getProductImage(id)`. Los listados usan `find().select({ image: { $cond: [{ $eq: [{ $substrCP: ["$image", 0, 5] }, "data:"] }, "data:", "$image"] }, ... })` (proyección con expresión; MongoDB ≥ 4.4) para traer solo el marcador `"data:"` en vez del contenido, y `populate("seller", "username displayName")`. Propiedad verificada con `ForbiddenError`; inexistencia/id inválido (`isValidObjectId`) con `NotFoundError` *(RF-5, RF-7 … RF-11)*.
  - `deleteProduct`: `Product.deleteOne` y después `User.updateMany({}, { $pull: { favorites: id, history: { productId: id }, cart: { productId: id } } })`; un fallo en la limpieza se registra y no revierte el borrado *(RF-11)*.
  - `errors.ts`: suma `ForbiddenError` (403) y `NotFoundError` (404) con mensajes por defecto en español.
  - `middleware/errorHandler.ts`: nuevo caso `type === "entity.too.large"` (o `status === 413`) → `413` "Los datos enviados superan el tamaño máximo permitido." antes del caso genérico *(RF-4)*.
  - `routes/productsRoutes.ts` + `controllers/productsController.ts` (nuevos): `GET /`, `GET /mine` (`requireAuth`), `GET /:id/image`, `GET /:id`, `POST /` (`requireAuth`), `PATCH /:id` (`requireAuth`), `DELETE /:id` (`requireAuth`). Los controladores validan con `@tiendadcc/utils` y delegan en el servicio. `GET /:id/image` escribe `Buffer.from(base64, "base64")` con `Content-Type`, `Cache-Control` y `nosniff`, o `302` si es ruta *(RF-5 … RF-11)*.
  - `app.ts`: `const largeJson = express.json({ limit: "2mb" })` montado solo en `POST /api/products` y `PATCH /api/products/:id`, y el `express.json()` por defecto envuelto para **no** procesar esas dos rutas (así el límite de 100 KB no cambia para el resto); monta `app.use("/api/products", productsRoutes)` *(RF-4)*.
  - `seed/seedProducts.ts` (lógica testeable: `parseSeedProducts`, `remapReferences`, `seedProducts`) + `seed/seedEnv.ts` (validación Zod del entorno) + `scripts/seed.ts` (script ejecutable delgado) + `seed/products.json` (copia del de `apps/frontend/client/src/data/`, sin cambiar formato; el original se elimina en la fase 4) *(RF-12)*: valida entorno con Zod (`MONGODB_URI`, `SEED_SELLER_PASSWORD` ≥ 8), conecta con `connectToDatabase`, crea o reutiliza el vendedor (`hashPassword` de `authService`), hace upsert por `{ seller, name }` de cada producto, construye el mapa `idAntiguo → _id` y remapea `favorites`/`history`/`cart` de los usuarios afectados; imprime el resumen y desconecta. Script `"seed": "node --env-file-if-exists=.env src/scripts/seed.ts"` en `apps/backend/package.json`; `SEED_SELLER_PASSWORD` se documenta en `.env.example`.

- **Lógica pura del frontend** — `src/logic/` *(RF-13, RF-14, RF-15, RF-17)*
  - `productApi.ts` (nuevo): funciones de RF-13 al estilo de `profileApi.ts` (`buildUrl`, `readErrorBody`, `failureFromStatus`, `parseBody` con `productSchema`/`productListSchema`); `fetchProduct` devuelve `{ ok: false, notFound: true }` en `404`; `fetchProductsByIds` arma lotes de 100 y omite la petición si la lista está vacía.
  - `productImage.ts` (nuevo): `resolveImageUrl(image, apiBaseUrl)` (antepone la base solo a `/api/...`).
  - `productParse.ts`: deja de definir el esquema; reexporta `Product`/`productSchema` de `@tiendadcc/utils` (o se elimina y se actualizan los imports).
  - `productRepository.ts`: el loader pasa a `fetchProducts({ featured: true })`; `createFeaturedProductsSource` se conserva para inyectar fuentes en tests *(RF-14)*.
  - `useProductList.ts` (nuevo): generaliza la máquina `loading | error | success` + `retry` de `useFeaturedProducts` para cualquier fuente; `useFeaturedProducts` pasa a ser un envoltorio *(RF-14, RF-19)*.
  - `productFilter.ts` / `categoryParam.ts`: las categorías salen de `PRODUCT_CATEGORIES`; `CATEGORY_SHORTCUTS` se deriva de ella *(RF-14)*.
  - `cartSync.ts`: `resolveLines(lines, products)` sin cambios de firma (recibe los productos obtenidos por ids); nueva `refreshCartItems(items, products)` que descarta inexistentes y actualiza `name`/`price`/`image` *(RF-15)*.
  - `cartStorage.ts`: `loadCartFromStorage()` valida solo la forma (`cartItemsSchema`), ya no contra un catálogo *(RF-15)*.
  - `imageProcessing.ts` (nuevo) *(RF-17)*:
    - `validateImageFile({ type, size })` → error en español o `null`.
    - `computeTargetDimensions(width, height, maxSide = 1200)`.
    - `estimateDataUrlBytes(dataUrl)` (reutiliza `base64DecodedBytes` de utils).
    - `QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5]` y `encodeWithinLimit(encode, maxBytes)`: prueba calidades hasta que `estimateDataUrlBytes ≤ MAX_IMAGE_BYTES`.
    - `processImageFile(file, deps)` con `deps = { decode(file) → { width, height }, encode(file, size, mime, quality) → dataUrl }`: prueba primero WebP y, si el data URL devuelto no es `image/webp` (el navegador cayó a PNG), recodifica en JPEG. La implementación real (`browserImageDeps`) usa `createImageBitmap(file, { imageOrientation: "from-image" })`, `document.createElement("canvas")`, fondo blanco para JPEG y `canvas.toDataURL`.
  - `productForm.ts` (nuevo): estado inicial desde un `Product`, `parsePriceInput("12000")` → número o error, `buildCreateInput`/`buildUpdateInput` (este último omite `image` si no cambió y devuelve `formError` cuando no hay cambios) y `FIELD_ORDER` para el foco.

- **Estado** — `src/context/CartContext.tsx` *(RF-15)*
  - Elimina el import de `products.json`. Al montar: carga local → `fetchProductsByIds(ids)` → `refreshCartItems`; si falla la red, no toca las líneas.
  - La sincronización con la cuenta (006/RF-12) obtiene los productos con `fetchProductsByIds(unión de ids local + cuenta)` antes de `mergeWithDelta`; si falla, aborta la sincronización de ese ciclo sin `PUT` (se reintenta en la próxima transición/carga).

- **Presentación** — `src/pages/` y `src/components/` *(RF-14, RF-16, RF-18 … RF-21)*
  - `components/OnlyAuthenticatedRoute.tsx`, `components/OnlyAnonymousRoute.tsx` (movidos desde `App.tsx`, sin cambiar comportamiento) *(RF-16)*.
  - `App.tsx`: importa los guards y suma `/publicar`, `/mis-publicaciones`, `/publicaciones/:id/editar` protegidas *(RF-16, RF-18 … RF-20)*.
  - `pages/CatalogPage.tsx`: `useProductList(fetchCatalogProducts)` con carga/error/reintento y filtro local *(RF-14)*.
  - `pages/ProductDetailPage.tsx`: carga por id, `404` → "Producto no encontrado" existente, "Publicado por", al dueño solo se le ofrece "Editar publicación" (sin carrito ni favoritos) *(RF-14)*.
  - `pages/ProfilePage.tsx`: favoritos e historial resueltos con una llamada `fetchProductsByIds` *(RF-15)*.
  - `components/ProductCard.tsx`, `FavoriteProductCard.tsx`, `CartItemRow.tsx`: `src={resolveImageUrl(...)}`, `loading="lazy"`, `decoding="async"` *(RF-13, RNF-4)*; `ProductCard` recibe `showShopActions` (por defecto `true`) y `/mis-publicaciones` lo apaga para ocultar carrito y favoritos *(RF-19)*.
  - `components/ProductForm.tsx` (nuevo): formulario compartido (`mode="create" | "edit"`) con `TextField`, `Textarea` + contador, `<select>` nativo, precio, selector de archivo con vista previa y "Cambiar imagen", estados "Procesando imagen…"/"Publicando…"/"Guardando…", errores por campo y foco al primero *(RF-18, RF-20)*.
  - `pages/PublishProductPage.tsx` (`/publicar`), `pages/MyProductsPage.tsx` (`/mis-publicaciones`), `pages/EditProductPage.tsx` (`/publicaciones/:id/editar`) *(RF-18, RF-19, RF-20)*.
  - `components/ConfirmDeleteDialog.tsx` (nuevo, sobre `AlertDialog`) *(RF-19)*.
  - `components/ui/textarea.tsx`, `components/ui/alert-dialog.tsx`: primitivas copiadas con la CLI de shadcn, con cabecera de origen (00/RF-11) *(RNF-5)*.
  - `components/Header.tsx`: enlace "Mis publicaciones" con sesión, también en la hamburguesa, con `aria-current` *(RF-21)*.
  - `logic/publicationNotice.ts`: constantes de los avisos y `readNotice(state)` validado con Zod; `productRepository.fetchMyPublications` alimenta `useProductList` en `/mis-publicaciones`. `thirdPartyCode.test.ts` admite que `alert-dialog` importe `@/components/ui/button`.
  - Avisos de éxito vía `navigate("/mis-publicaciones", { state: { notice } })`, leídos una vez y limpiados con `replace` *(RF-18 … RF-20)*.

## 2. Modelo de datos
*Cubre: RF-1, RF-5, RF-6, RF-12.*

Documento `Product` en MongoDB (subida de usuario; `image` guarda el data URL completo):

```json
{
  "_id": "6713b0c2a1f4e9d2c8b70a11",
  "name": "Polerón CC5003",
  "description": "Polerón gris con el logo del curso, talla M.",
  "category": "Poleras",
  "price": 18000,
  "image": "data:image/webp;base64,UklGRlYAAABXRUJQVlA4…",
  "featured": false,
  "seller": "6712a4f3c9b1e24a8f0d1234",
  "createdAt": "2026-10-13T15:00:00.000Z",
  "updatedAt": "2026-10-13T15:00:00.000Z"
}
```

Producto del seed (conserva su ruta):

```json
{
  "_id": "6713b0c2a1f4e9d2c8b70a01",
  "name": "Taza DCC",
  "description": "Taza de cerámica con el logo del DCC.",
  "category": "Tazas",
  "price": 6000,
  "image": "/images/taza-dcc.png",
  "featured": true,
  "seller": "6713b0c2a1f4e9d2c8b70a00"
}
```

Contrato público (todas las respuestas de producto; nunca contiene el data URL):

```json
{
  "id": "6713b0c2a1f4e9d2c8b70a11",
  "name": "Polerón CC5003",
  "description": "Polerón gris con el logo del curso, talla M.",
  "category": "Poleras",
  "price": 18000,
  "image": "/api/products/6713b0c2a1f4e9d2c8b70a11/image?v=1760367600000",
  "featured": false,
  "seller": { "id": "6712a4f3c9b1e24a8f0d1234", "username": "anaperez", "displayName": "Ana Pérez" },
  "createdAt": "2026-10-13T15:00:00.000Z",
  "updatedAt": "2026-10-13T15:00:00.000Z"
}
```

Entradas revalidadas en el servidor:

```json
{ "name": "Polerón CC5003", "description": "…", "category": "Poleras", "price": 18000, "image": "data:image/webp;base64,…" }
```

```json
{ "price": 15000 }
```

(`POST` exige todos los campos; `PATCH` acepta cualquier subconjunto no vacío. `featured`, `seller` e `id` se descartan. El `User` no cambia: `favorites`, `history[].productId` y `cart[].productId` guardan el `_id` del producto como string.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Data URL guardado en el documento, nunca devuelto; imagen servida aparte.**
- Justificación: el modelo pedido guarda `image: String` y la subida va en el JSON; servir la imagen como binario con caché inmutable versionada evita listados de varios MB, permite `loading="lazy"` y reutiliza la caché del navegador entre vistas *(RF-5, RF-6, RNF-4)*.
- Alternativa descartada: **devolver el data URL en todas las respuestas**. Más simple, pero el listado crece linealmente con las publicaciones (~400 KB por producto en base64) y no se cachea; **excluir `image` del listado** deja las tarjetas sin foto.

**D2 — Proyección con expresión en los listados.**
- Justificación: para construir la ruta pública solo hace falta saber si la imagen es data URL; `$substrCP` en la proyección evita traer el contenido desde MongoDB *(RF-5)*.
- Alternativa descartada: **campo extra `imageKind`/`hasUploadedImage`**. Duplica estado que puede divergir y cambia el modelo acordado.

**D3 — Validación de imagen en `utils` con firma de bytes.**
- Justificación: una sola regla para frontend y backend (§6, AGENTS.md); verificar la firma impide servir con `Content-Type: image/*` contenido que no es imagen *(RF-3, RNF-3)*.
- Alternativa descartada: **validar solo el prefijo `data:image/...`**. Cualquiera puede declarar `image/png` con contenido arbitrario.

**D4 — Límite de 2 MB solo en `POST`/`PATCH` de productos.**
- Justificación: 1 MB decodificado ≈ 1,37 MB en base64 más los demás campos; el resto de la API conserva los 100 KB por defecto, reduciendo la superficie de abuso *(RF-4)*.
- Alternativa descartada: **subir el límite global**. Afecta a `/api/auth` y `/api/users` sin necesidad.

**D5 — Redimensión en el navegador con dependencias inyectadas.**
- Justificación: reduce la carga a ≤1 MB antes de enviar y deja la lógica (dimensiones, calidad, validación) como funciones puras testeables en jsdom, que no implementa `canvas` *(RF-17, §3, §4)*.
- Alternativa descartada: **procesar en el servidor** (p. ej. `sharp`). Dependencia nativa nueva y archivos grandes viajando por la red.

**D6 — Orden de evaluación 401 → 404 → 403 → 400.**
- Justificación: no revela detalles del cuerpo a quien no puede editar, y es determinista para los tests *(RF-10, RF-11)*.
- Alternativa descartada: **validar el cuerpo primero**. Un no dueño recibiría `400` y aprendería las reglas antes que el `403`.

**D7 — `404` para ids con formato inválido.**
- Justificación: para el cliente un id mal formado equivale a "no existe" (p. ej. ids antiguos `"taza-dcc"` en enlaces guardados); evita el `CastError` → `500` de Mongoose *(RF-7)*.
- Alternativa descartada: **`400` por id inválido**. Obliga al frontend a distinguir dos estados que se muestran igual.

**D8 — Limpieza de referencias con un `updateMany` + `$pull`, sin transacción.**
- Justificación: una sola operación para todas las cuentas; `mongodb-memory-server` en modo standalone no soporta transacciones, y el frontend ya tolera referencias huérfanas *(RF-11, RF-15)*.
- Alternativa descartada: **transacción multi-documento**. Requiere replica set en desarrollo y tests.

**D9 — Catálogo cargado una vez y filtrado localmente.**
- Justificación: conserva el cambio de filtro inmediato y sin animación (00/RF-7) y los tests actuales de `CatalogPage`; el volumen esperado no justifica paginación *(RF-14)*.
- Alternativa descartada: **pedir `?categoria=` en cada cambio**. Latencia visible al filtrar; el filtro queda disponible en la API para otros usos.

**D10 — Carrito optimista con refresco por ids.**
- Justificación: el carrito aparece al instante desde `localStorage` y luego se corrige con datos del servidor; ante red caída no se borra nada ni se sube un carrito recortado *(RF-15)*.
- Alternativa descartada: **bloquear el carrito hasta tener respuesta** o **descartar todo lo no resuelto**. Lo primero empeora la percepción; lo segundo vacía carritos ante un corte de red.

**D11 — Seed idempotente con remapeo de ids antiguos.**
- Justificación: upsert por `{ seller, name }` permite re-ejecutarlo; el remapeo conserva favoritos/carritos de las cuentas de desarrollo creadas con 006–007 *(RF-12)*.
- Alternativa descartada: **borrar y recrear la colección**. Cambia los `_id` en cada ejecución y rompe referencias.

**D12 — `products.json` copiado al backend en la fase 3 y eliminado del cliente en la fase 4.**
- Justificación: copiarlo en la fase 3 mantiene el cliente compilando mientras aún lo importa; borrarlo en la fase 4, cuando no queda ningún import, garantiza que ningún código del cliente lo lea (criterio 8) y deja una única copia junto a su único consumidor, sin cambiar su formato *(RF-12, RF-14)*.
- Alternativa descartada: **moverlo en la fase 3** (rompe la compilación del cliente hasta la fase 4) y **leerlo desde `apps/frontend/client/src/data/`**. Acopla el backend a la estructura del cliente y mantiene la tentación de importarlo.

**D13 — Primitivas `textarea` y `alert-dialog` de shadcn; `<select>` nativo.**
- Justificación: el diálogo de confirmación necesita foco atrapado y retorno (RNF-7), que `AlertDialog` de `radix-ui` (ya sancionado) resuelve; un `<select>` nativo es accesible y suficiente para tres categorías *(RF-18, RF-19, RNF-5)*.
- Alternativa descartada: **`window.confirm`** (no estilable ni coherente con el DS) y **`select` de shadcn** (más código copiado sin beneficio).

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 14.*

- **Lógica pura obligatoria (§4):**
  - `utils/productSchemas.test.ts`: imagen válida JPEG/PNG/WebP mínima (bytes de firma reales); rechaza GIF, SVG, `text/html`, sin prefijo, base64 corrupto, firma que no coincide con el tipo, 1 MB + 1 byte (acepta exactamente 1 MB); `productImageSchema` acepta `/images/x.png` y URL `https`; `createProductInputSchema` (límites de `name`/`description`, `price` 0/−1/1,5/10.000.001, categoría fuera del enum, descarta `featured`/`seller`); `updateProductInputSchema` (parcial, vacío → error); `productListQuerySchema` (`featured`, `ids` con dedupe y tope 100, categoría inválida). *(Verifica RF-2, RF-3, RF-5)*
  - `imageProcessing.test.ts`: `validateImageFile` (tipos, 10 MB), `computeTargetDimensions` (horizontal, vertical, cuadrada, sin agrandar), `estimateDataUrlBytes`, `encodeWithinLimit` (primera calidad suficiente, baja hasta 0,5, error si no alcanza), `processImageFile` con deps falsas (WebP soportado/no soportado, error de decodificación). *(Verifica RF-17)*
  - `productApi.test.ts`: con `fetch` simulado, cada función mapea `200/201/204` a datos validados, `400` a `fieldErrors`, `401/403/404/413` a mensajes en español, red caída a error; `fetchProductsByIds` arma lotes de 100 y no llama con lista vacía. *(Verifica RF-13)*
  - `productImage.test.ts`, `productForm.test.ts`, `cartSync.test.ts` (`refreshCartItems` descarta inexistentes y actualiza precio). *(Verifica RF-13, RF-15, RF-18, RF-20)*
- **Backend (rutas con supertest + `mongodb-memory-server`, §4):**
  - `GET /api/products`: orden por recientes; `categoria` válida/ inválida (`400`); `featured=true/false`/inválido; `ids` con orden pedido, ids inválidos e inexistentes omitidos, vacío → `[]`, 101 ids → `400`; combinación de filtros; **ninguna respuesta contiene `data:`**; `seller` sin `email`. *(RF-1, RF-5)*
  - `GET /:id/image`: binario con `Content-Type`, `Cache-Control` y `nosniff`; `302` para rutas del seed; `404`. `v` cambia tras editar la imagen. *(RF-6)*
  - `GET /:id`: `200`, `404` por inexistente y por id inválido. `GET /mine`: `401`, solo los propios, `[]`. *(RF-7, RF-8)*
  - `POST /`: `401`; `201` con `seller` de la sesión y `featured: false` aunque el cuerpo diga otra cosa; `400` por campo, incluidas imagen con tipo inválido (`image/gif`) y demasiado grande (> 1 MB decodificada, < 2 MB de cuerpo); `413` con cuerpo > 2 MB. *(RF-3, RF-4, RF-9)*
  - `PATCH /:id`: `401`, `404`, `403` (otro usuario, sin cambios en BD), `400` cuerpo vacío, `200` parcial que conserva la imagen si no se envía y la reemplaza si se envía; ignora `featured`/`seller`. *(RF-10)*
  - `DELETE /:id`: `401`, `404`, `403`, `204`; tras borrar, el id desaparece de `favorites`, `history` y `cart` de **dos** usuarios distintos sin tocar sus otras entradas. *(RF-11)*
  - Límite: `POST /api/auth/login` con cuerpo > 100 KB → `413` (el límite global no cambió). *(RF-4)*
  - Seed (función exportada, sin `process.exit`): crea vendedor y productos, segunda ejecución no duplica, remapea `"taza-dcc"` en un usuario existente. *(RF-12)*
- **Frontend (smoke de render, no exige cobertura, §4):**
  - Guards: anónimo → `/iniciar-sesion` en las cuatro rutas protegidas; autenticado fuera de `/registro`; nada mientras carga. *(RF-16)*
  - `CatalogPage`: carga, error con "Reintentar", filtro local, categorías desde el enum. `ProductDetailPage`: carga, `404`, "Publicado por", "Editar publicación" solo al dueño. `HomePage` con fuente inyectada (sin cambios en sus tests). *(RF-14)*
  - `CartContext`: descarta líneas inexistentes tras refrescar, conserva todo si la red falla, sin `PUT` recortado. `ProfilePage`: oculta favoritos/historial inexistentes con una sola llamada. *(RF-15)*
  - `PublishProductPage`/`ProductForm`: campos y etiquetas, error de formato de imagen, vista previa, "Procesando imagen…", errores por campo con foco, "Publicando…" sin doble envío, `400` del servidor sin perder datos, navegación con aviso (procesamiento de imagen inyectado). *(RF-18)*
  - `MyProductsPage`: lista, vacío con "Publicar producto", diálogo de confirmación (cancelar no borra; confirmar borra y anuncia), error sin quitar. *(RF-19)*
  - `EditProductPage`: prellenado, sin `image` en el `PATCH` si no cambió, "No puedes editar esta publicación.", `404`. *(RF-20)*
  - `Header`: "Mis publicaciones" con sesión (también en hamburguesa), ausente sin sesión. *(RF-21)*
  - Tests existentes afectados (`productParse`, `productRepository`, `CatalogPage`, `ProductDetailPage`, `ProfilePage`, `CartContext`, `cartSync`, `cartStorage`, `App`, `Header`) pasan a `fetch` simulado o fuentes inyectadas y a `makeProduct` con ids tipo `ObjectId`, sin eliminar aserciones vigentes.
- **Verificación de contrato por QA (manual):**
  - Seed contra MongoDB local; catálogo, inicio y detalle muestran los tres productos con sus imágenes.
  - Publicar desde escritorio y móvil (360 px) una foto JPG grande (≥ 4000 px), un PNG con transparencia y un WebP; rechazo de GIF y de un archivo > 10 MB.
  - Pestaña de red: el listado no trae data URLs; la imagen se sirve desde `/api/products/:id/image` y se cachea; tras editar la imagen cambia `v`.
  - Editar sin cambiar imagen; borrar con confirmación (teclado, `Escape`, foco de retorno); el producto desaparece del carrito/favoritos de otra cuenta.
  - Otro usuario no puede editar (UI y `curl` → `403`).
- **Red / mocking:** backend con `mongodb-memory-server`; frontend con `fetch` simulado, fuentes inyectadas y deps de imagen falsas; sin red real ni e2e.
- **Comando de cierre:** `npm run check` en la raíz (`tsc --noEmit` + Vitest de `utils`, backend y frontend) debe pasar al cerrar cada fase.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `utils/productSchemas.ts` (categorías, imagen, create/update/query, público) | RF-1, RF-2, RF-3, RF-5 |
| `models/Product.ts` + `toPublicJSON` + `publicImageUrl` | RF-1, RF-5 |
| `app.ts` (parsers por ruta) + `errorHandler` (`413`) | RF-4 |
| `productService` + `productsRoutes`/`productsController` | RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11 |
| `ForbiddenError` / `NotFoundError` | RF-7, RF-10, RF-11 |
| `seed/seedProducts.ts` + `seed/seedEnv.ts` + `scripts/seed.ts` + `seed/products.json` | RF-12 |
| `productApi.ts` + `productImage.ts` | RF-13 |
| `productRepository` + `useProductList` + `CatalogPage` + `ProductDetailPage` | RF-14 |
| `cartSync`/`cartStorage`/`CartContext` + `ProfilePage` por ids | RF-15 |
| `OnlyAuthenticatedRoute` / `OnlyAnonymousRoute` + rutas en `App.tsx` | RF-16 |
| `imageProcessing.ts` | RF-17 |
| `ProductForm` + `productForm.ts` + `PublishProductPage` | RF-18 |
| `MyProductsPage` + `ConfirmDeleteDialog` + `alert-dialog` | RF-19 |
| `EditProductPage` | RF-20 |
| `Header` ("Mis publicaciones") | RF-21 |
| Tests de lógica pura, rutas y smoke en Vitest | verificación RF-1…RF-21 (§4) |

---

*Nota:* la spec 008 marca como "decisión de esta spec, revisar" la eficiencia del listado (endpoint de imagen), el tope de precio, el formato de `?categoria=`, la navegación tras publicar, el remapeo del seed y las credenciales del vendedor de prueba. El plan asume esos valores; si alguno cambia, se actualiza primero la spec. El siguiente paso es `specs/008-product-publications/tasks.md`.
