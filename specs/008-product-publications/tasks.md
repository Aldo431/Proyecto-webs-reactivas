# Tasks 008 — Publicaciones de productos

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Cada fase cierra con `npm run check` en verde; marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario del delta sobre 002–007**
    RF: RF-1…RF-21 (base para todo)
    Hecho cuando: conozco todas las lecturas de `products.json` (`productRepository`, `CatalogPage`, `ProductDetailPage`, `ProfilePage`, `CartContext`, `productParse.test`), `productSchema` del cliente, `cartSync.resolveLines`/`loadCartFromStorage(catalog)`, `errorHandler` y `errors.ts`, `app.ts` (`express.json()` global), los guards dentro de `App.tsx`, `Header` (enlaces y hamburguesa) y el sistema de diseño (`specs/00-design-system`), y las dependencias están instaladas (`npm install`) con `npm run check` en verde antes de empezar.

## Fase 1 — utils: esquemas de producto (depende de 1)

- [x] **2. Categorías, constantes y helpers de data URL**
    RF: RF-1, RF-3
    Hecho cuando: `utils/src/productSchemas.ts` exporta `PRODUCT_CATEGORIES`, `productCategorySchema`, `MAX_IMAGE_BYTES`, `ALLOWED_IMAGE_TYPES`, `MAX_PRODUCT_PRICE`, `MAX_IDS_PER_QUERY`, `parseDataUrl`, `base64DecodedBytes` y `hasImageSignature`, y sus tests (tipos, tamaños exactos y firmas JPEG/PNG/WebP reales) pasan.

- [x] **3. `uploadImageSchema` y `productImageSchema`**
    RF: RF-2, RF-3
    Hecho cuando: la imagen subida se valida en el orden obligatoria → tipo → base64 → ≤ 1 MB → firma con mensajes en español, la pública acepta además rutas `/…` y URLs `http(s)`, y los tests (GIF, SVG, `text/html`, corrupto, firma cruzada, 1 MB exacto y 1 MB + 1) pasan.

- [x] **4. Esquemas de producto, entrada y consulta**
    RF: RF-1, RF-2, RF-5
    Hecho cuando: existen `productSellerSchema`, `productSchema`, `productListSchema`, `createProductInputSchema`, `updateProductInputSchema` (parcial, vacío → "No hay cambios para guardar.") y `productListQuerySchema` (`categoria`, `featured`, `ids` con dedupe y tope 100), reexportados en `index.ts`, y sus tests (límites, precio, categoría, descarte de `featured`/`seller`) pasan; `npm run check` en verde.

## Fase 2 — backend: modelo, servicio y rutas (depende de 4)

- [x] **5. Modelo `Product` y serialización pública**
    RF: RF-1, RF-5
    Hecho cuando: `models/Product.ts` define los campos y límites de RF-1 con `seller` `ref: "User"` indexado e índice `{ createdAt: -1, _id: -1 }`, `toPublicJSON` devuelve el contrato con `seller` sin correo y `publicImageUrl` convierte data URLs en `/api/products/<id>/image?v=<ms>`, y `npm run check -w backend` compila.

- [x] **6. Errores `403`/`404` y `413` en el `errorHandler`**
    RF: RF-4, RF-7, RF-10, RF-11
    Hecho cuando: `errors.ts` suma `ForbiddenError` y `NotFoundError` con mensajes en español y el `errorHandler` responde `413` "Los datos enviados superan el tamaño máximo permitido." ante `entity.too.large`, con tests.

- [x] **7. Servicio de productos: lectura**
    RF: RF-5, RF-6, RF-7, RF-8
    Hecho cuando: `productService` implementa `listProducts(query)` (filtros AND, orden, `ids` en el orden pedido omitiendo inválidos), `listProductsBySeller`, `findPublicProduct` (`404` por id inválido) y `getProductImage`, con la proyección que no trae el data URL, y sus tests pasan.

- [x] **8. Servicio de productos: escritura y limpieza**
    RF: RF-9, RF-10, RF-11
    Hecho cuando: `createProduct` fija `seller` y `featured: false`, `updateProduct` aplica 404 → 403 y conserva la imagen si no llega, `deleteProduct` borra y hace `$pull` en `favorites`/`history`/`cart` de todos los usuarios, y sus tests pasan.

- [x] **9. Rutas, controlador y parsers por ruta**
    RF: RF-4…RF-11
    Hecho cuando: `productsRoutes`/`productsController` montan `GET /`, `GET /mine`, `GET /:id/image`, `GET /:id`, `POST /`, `PATCH /:id` y `DELETE /:id` en `/api/products` con `requireAuth` donde corresponde y validación Zod (orden 401 → 404 → 403 → 400), `app.ts` aplica 2 MB solo a `POST`/`PATCH` de productos manteniendo 100 KB en el resto, y la imagen se sirve con `Content-Type`, `Cache-Control` inmutable y `nosniff` (o `302`).

- [x] **10. Tests de rutas de productos**
    RF: RF-1, RF-3…RF-11
    Hecho cuando: con supertest + `mongodb-memory-server` verifico `401` sin sesión, `403` no dueño (sin cambios en BD), `404` (inexistente e id inválido), `400` por campo incluida imagen con tipo inválido y demasiado grande, `413` en productos y en `/api/auth/login` > 100 KB, filtros `categoria`/`featured`/`ids`, ausencia de `data:` en todas las respuestas, imagen servida y `v` que cambia al editar, y limpieza de favoritos/historial/carrito de dos usuarios al borrar; `npm run check` en verde.

## Fase 3 — seed (depende de 9)

- [x] **11. Copiar `products.json` al backend y script de seed**
    RF: RF-12
    Hecho cuando: `products.json` se copia a `apps/backend/src/seed/` sin cambios de formato (la copia del cliente se borra en la tarea 17, cuando ya nadie la importa), `seed/seedProducts.ts` exporta la función testeable `seedProducts()` (usa la conexión activa de Mongoose), `seed/seedEnv.ts` valida el entorno (`MONGODB_URI`, `SEED_SELLER_PASSWORD` ≥ 8) con Zod antes de conectar, `scripts/seed.ts` es solo el script ejecutable (lee el entorno, conecta, informa y desconecta), y `seedProducts()` crea o reutiliza el vendedor `tiendadcc`, hace upsert por `{ seller, name }` conservando imágenes y `featured`, remapea ids antiguos en `favorites`/`history`/`cart` e imprime el resumen en español; `npm run seed -w backend` lo ejecuta y `.env.example`/`AGENTS.md` documentan `SEED_SELLER_PASSWORD`.

- [x] **12. Tests del seed**
    RF: RF-12
    Hecho cuando: con `mongodb-memory-server` verifico que crea vendedor y tres productos, que una segunda ejecución no duplica, y que un usuario con `"taza-dcc"` en favoritos, historial y carrito queda con el nuevo `_id`; `npm run check` en verde.

## Fase 4 — frontend lectura (depende de 9, 11)

- [x] **13. `productApi.ts`, `resolveImageUrl` y tipo `Product` compartido**
    RF: RF-2, RF-13
    Hecho cuando: `productApi.ts` expone las siete funciones de RF-13 con `credentials: "include"`, validación Zod y resultados discriminados (incluido "no encontrado" y lotes de 100 en `fetchProductsByIds`), `productImage.ts` resuelve `/api/...` contra `VITE_API_URL`, las páginas y componentes de catálogo usan el tipo `Product` de `@tiendadcc/utils` (el `productParse.ts` heredado se conserva solo para los consumidores de `products.json` de carrito y perfil, y pasa a `@tiendadcc/utils` en la tarea 17), `makeProduct` genera productos con el contrato nuevo, y sus tests con `fetch` simulado pasan.

- [x] **14. Inicio y catálogo desde la API**
    RF: RF-14
    Hecho cuando: `productRepository` usa `fetchProducts({ featured: true })`, `useProductList` generaliza carga/error/reintento (y `useFeaturedProducts` lo envuelve), `CatalogPage` carga una vez, filtra localmente con categorías de `PRODUCT_CATEGORIES` y muestra carga/error con "Reintentar", las imágenes usan `resolveImageUrl` + `loading="lazy"`, y sus tests pasan.

- [x] **15. Detalle desde la API**
    RF: RF-14
    Hecho cuando: `ProductDetailPage` carga por id con estados de carga, "Producto no encontrado" en `404` y error con "Reintentar", muestra "Publicado por <displayName>" y "Editar publicación" solo al dueño, registra la visita con el id del backend, y sus tests pasan.

- [x] **16. Carrito resuelto por ids**
    RF: RF-15
    Hecho cuando: `loadCartFromStorage` valida solo la forma, `refreshCartItems` descarta inexistentes y actualiza nombre/precio/imagen, `CartContext` refresca al montar y resuelve la fusión/restauración con `fetchProductsByIds(unión)` sin descartar ni enviar `PUT` si la red falla, y sus tests (incluidos los de `cartSync`/`cartStorage` actualizados) pasan.

- [x] **17. Favoritos e historial por ids y fin de `products.json` en el cliente**
    RF: RF-14, RF-15
    Hecho cuando: `ProfilePage` resuelve favoritos e historial con una sola `fetchProductsByIds`, ocultando inexistentes; `productParse.ts` deja de definir su propio esquema y reexporta `Product` de `@tiendadcc/utils`; `grep` no encuentra imports de `products.json` en `src/` ni en tests; se borra `apps/frontend/client/src/data/products.json`; y `npm run check` está en verde.

## Fase 5 — frontend publicar (depende de 13)

- [x] **18. Guards en archivos propios**
    RF: RF-16
    Hecho cuando: `OnlyAuthenticatedRoute.tsx` y `OnlyAnonymousRoute.tsx` viven en `src/components/` con props tipadas, `App.tsx` los importa sin cambiar comportamiento, y sus tests (carga, anónimo, autenticado) pasan.

- [x] **19. Lógica de procesamiento de imagen**
    RF: RF-17
    Hecho cuando: `imageProcessing.ts` implementa `validateImageFile`, `computeTargetDimensions`, `estimateDataUrlBytes`, `encodeWithinLimit` (0,8 → 0,5) y `processImageFile` con deps inyectadas (WebP o JPEG sobre fondo blanco, orientación EXIF), más `browserImageDeps` real, y sus tests con deps falsas pasan.

- [x] **20. Primitivas `textarea` y `alert-dialog`**
    RF: RNF-5, RNF-6
    Hecho cuando: copio con la CLI de shadcn `components/ui/textarea.tsx` y `components/ui/alert-dialog.tsx` con cabecera de origen (00/RF-11), sin dependencias npm nuevas ni `tw-animate-css`, y `npm run check` compila.

- [x] **21. `productForm.ts` y `ProductForm` compartido**
    RF: RF-18, RF-20
    Hecho cuando: `productForm.ts` (estado inicial, `parsePriceInput`, `buildCreateInput`/`buildUpdateInput`, `FIELD_ORDER`) tiene tests, y `ProductForm` muestra los cinco campos con `label`, contador de descripción, `<select>` de categorías, selector de archivo con vista previa y "Cambiar imagen", "Procesando imagen…", errores por campo con foco al primero y botón deshabilitado durante el envío.

- [x] **22. Página `/publicar`**
    RF: RF-16, RF-18
    Hecho cuando: `/publicar` está protegida, envía con `createProduct`, muestra "Publicando…" sin doble envío, conserva datos e imagen ante `400`/`413` con mensajes en español, y al tener éxito navega a `/mis-publicaciones` con "Tu producto se publicó."; sus smoke tests pasan y `npm run check` está en verde.

## Fase 6 — frontend gestionar (depende de 22)

- [x] **23. Página `/mis-publicaciones` con borrado confirmado**
    RF: RF-19
    Hecho cuando: la página carga `fetchMyProducts` con carga/error/"Reintentar", lista imagen, nombre, categoría, precio CLP, "Editar" y "Eliminar" con `aria-label`, muestra el vacío con "Publicar producto", confirma el borrado con `ConfirmDeleteDialog` (foco atrapado, `Escape`, retorno de foco), quita la publicación tras `204` con "Publicación eliminada." y muestra una vez los avisos de llegada; sus smoke tests pasan.

- [x] **24. Página `/publicaciones/:id/editar`**
    RF: RF-20
    Hecho cuando: la página prellena `ProductForm` desde `fetchProduct`, muestra "Producto no encontrado." o "No puedes editar esta publicación." con enlace a "Mis publicaciones", envía `PATCH` sin `image` si no cambió, muestra "Guardando…" y navega con "Cambios guardados.", y sus smoke tests pasan.

- [x] **25. "Mis publicaciones" en el encabezado**
    RF: RF-21
    Hecho cuando: `Header` muestra "Mis publicaciones" con sesión (también en la hamburguesa) con `aria-current="page"` en las tres rutas de publicaciones y lo oculta sin sesión, y sus tests pasan.

- [x] **26. Actualizar los tests existentes afectados**
    RF: RF-14…RF-21
    Hecho cuando: `App`, `Header`, `HomePage`, `CatalogPage`, `ProductDetailPage`, `ProfilePage`, `ProductGrid`, `FeaturedProducts`, `CartContext` y lógica de carrito usan `fetch` simulado o fuentes inyectadas con productos del contrato nuevo, sin eliminar aserciones vigentes, y pasan.

## Fase 7 — Verificación y cierre (depende de 12, 26)

- [ ] **27. Verificación QA según criterios de finalización, accesibilidad y responsividad**
    RF: RF-1…RF-21, RNF-1…RNF-9
    Hecho cuando: verifico manualmente contra MongoDB local el seed, la lectura de inicio/catálogo/detalle, la publicación de JPG grande, PNG con transparencia y WebP (y rechazo de GIF y > 10 MB) en escritorio y 360 px, que la red no transporta data URLs y la imagen se cachea, la edición sin cambiar imagen, el borrado confirmado por teclado, la limpieza en otra cuenta, el `403` a un no dueño, y textos, foco y contraste.

- [ ] **28. Cierre: `npm run check` en verde**
    RF: RNF-9, criterio de finalización 14
    Hecho cuando: `npm run check` (tipos de `utils`, backend y frontend + tests) pasa sin errores y anoto el resultado en la respuesta final.
