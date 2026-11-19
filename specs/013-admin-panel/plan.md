# Plan 013 — Panel de administración (contenido)

Plan de implementación para la spec `013-admin-panel`. Respeta la constitución (§1–§6) y AGENTS.md, y cubre RF-1 a RF-14. Parte de lo que dejó 012: `adminRoutes` con `requireAuth` + `requireAdmin`, `AdminLayout`, `adminSections.ts` y las cuatro páginas en `pages/admin/`.

## 1. Esquemas compartidos — `utils/src/adminSchemas.ts` (nuevo)
*Cubre: RF-1 a RF-9 (RNF-4).*

- `ADMIN_PAGE_SIZE = 20`.
- Consultas (con `z.coerce` y mensajes en español, siguiendo `productListQuerySchema`):
  - `adminProductQuerySchema`: `q?` (trim, máx. `SEARCH_MAX_LENGTH`), `categoria?: productCategorySchema`, `destacados?: "true"` → boolean, `pagina` (entero ≥ 1, default 1).
  - `adminUserQuerySchema`: `q?`, `rol?: userRoleSchema`, `pagina`.
  - `adminReviewQuerySchema`: `calificacion?: "bajas" | "altas"`, `orden: "recientes" | "menor"` (default `"recientes"`), `pagina`.
- Cuerpos: `setFeaturedInputSchema = z.object({ featured: z.boolean({ error: "Indica si el producto es destacado." }) })`, `setRoleInputSchema = z.object({ role: userRoleSchema })` (mensaje "Rol inválido.").
- Respuestas:
  - `adminProductSchema = productSchema.extend({ reviewCount: z.number().int().min(0), averageRating: z.number().nullable() })`.
  - `adminUserSchema = z.object({ id, username, displayName, email, role, emailVerified, productCount, reviewCount, createdAt })`.
  - `adminReviewSchema = reviewSchema.extend({ product: z.object({ id, name }) })`.
  - `adminActivitySchema`: `z.discriminatedUnion("type", [...])` con los tres tipos de RF-1.
  - `adminOverviewSchema` con la forma de RF-1.
  - `adminPageSchema(item)` → `{ items: z.array(item), total, pagina, porPagina, totalPaginas }`.
- Exportar desde `utils/src/index.ts`.
- Tests en `adminSchemas.test.ts`: defaults, `destacados=true`, `rol` inválido, `pagina=0`, cuerpos válidos e inválidos, y un overview mínimo.

## 2. Backend — `apps/backend/src/`
*Cubre: RF-1 a RF-9.*

### Servicios
- `services/productService.ts`:
  - Extraer `removeProductAndReferences(id)` desde `deleteProduct`: borra el producto, luego `Review.deleteMany({ product: id })` y luego el `$pull` en usuarios (cada limpieza en su `try/catch` con `console.error`, como hoy). `deleteProduct(userId, id)` llama a `assertProductOwner` y después a esta función (RF-5).
  - Exportar `READ_PROJECTION`, `SPANISH_COLLATION`, `diacriticInsensitivePattern` y `findProducts` (o un `findProductsPage`) para reutilizarlos sin duplicar.
- `services/adminService.ts` (nuevo), con una función por ruta:
  - `getOverview(now = new Date())` *(RF-1)*:
    - conteos con `countDocuments`; `byCategory` con `$group` completado con ceros en el orden de `PRODUCT_CATEGORIES`;
    - reseñas con `$lookup` a `products` y `$match` de producto existente (excluye huérfanas), y luego `$group` para total, promedio, nuevas y bajas de los últimos 7 días;
    - actividad: los 8 usuarios, 8 productos y 8 reseñas más recientes (con `populate`), mapeados a eventos, mezclados, ordenados por `at` y cortados en 8;
    - `latestProducts` con `findProducts({}, NEWEST_FIRST, { skip: 0, limit: 4 })`;
    - `lowReviews` como en RF-8 con `limit 3`.
    `now` inyectable para tests deterministas.
  - `listAdminProducts(query)` *(RF-2)*: filtro por categoría y destacados; `q` busca en `name` o en `seller` (primero resuelve los ids de usuarios cuyo `username` coincide con el patrón). Pagina como `listProductPage` y agrega `reviewCount` y `averageRating` con **una** agregación sobre `Review` (`$match product $in idsDeLaPágina`, `$group`).
  - `setProductFeatured(id, featured)` *(RF-3)*: 404 si no existe; `updateOne` y devuelve el ítem de RF-2.
  - `adminDeleteProduct(id)` *(RF-4)*: 404 si no existe; `removeProductAndReferences(id)`.
  - `listAdminUsers(query)` *(RF-6)*: filtro `$or` sobre `displayName`, `username` y `email` con el patrón sin tildes; `rol=user` → `{ role: { $ne: "admin" } }` (incluye legados). Proyección explícita sin campos sensibles. `productCount` y `reviewCount` con una agregación cada una sobre los ids de la página.
  - `setUserRole(actingUserId, targetId, role)` *(RF-7)*: 404 → 403 si `targetId === actingUserId` ("No puedes cambiar tu propio rol.") → `updateOne` → devuelve el ítem de RF-6.
  - `listAdminReviews(query)` *(RF-8)*: agregación con `$match` por calificación, `$lookup` a `products` (proyección `name`) y a `users` (autor), `$unwind` sin `preserveNull` (descarta huérfanas), `$sort` (`recientes`: `createdAt -1, _id -1`; `menor`: `rating 1, createdAt -1, _id -1`) y `$facet` para total y página.
  - `adminDeleteReview(id)` *(RF-9)*: 404 si no existe; `deleteOne`.

### Controladores y rutas
- `controllers/adminController.ts`: un handler por ruta. Parsea consultas y cuerpos con los esquemas de utils (un `ZodError` ya lo convierte en 400 el `errorHandler`). El orden 404 → 400 se respeta comprobando la existencia antes de validar el cuerpo, como en `productsController`.
- `routes/adminRoutes.ts`:
  ```
  GET    /overview
  GET    /products
  PATCH  /products/:id/featured
  DELETE /products/:id
  GET    /users
  PATCH  /users/:id/role
  GET    /reviews
  DELETE /reviews/:id
  ```
- El límite de 100 KB del cuerpo JSON no cambia: estos cuerpos son mínimos. Verificar que la regex `EDIT_PRODUCT_PATH` de `app.ts` no capture `/api/admin/products/...` (empieza con `/api/products`, así que no la captura).

### Tests backend (`routes/adminRoutes.test.ts`, ampliar)
- Cada ruta nueva: 401 sin sesión y 403 con usuario normal (con una prueba parametrizada sobre la lista de rutas).
- Overview: base vacía; datos sembrados con fechas controladas (`now` inyectado o `createdAt` explícito); categorías con 0; reseña huérfana excluida; actividad ordenada y cortada en 8.
- Productos: filtros, búsqueda por vendedor, paginación y ajuste de página, `reviewCount`/`averageRating`, destacar (200/400/404), borrar producto ajeno (204, referencias y reseñas eliminadas).
- RF-5 en `productsWriteRoutes.test.ts`: el dueño borra y sus reseñas desaparecen.
- Usuarios: búsqueda por correo, `rol=user` incluye legados, sin campos sensibles, conteos, cambiar rol (200), propio rol (403), rol inválido (400), id inexistente (404).
- Reseñas: `bajas`/`altas`, `orden=menor`, huérfanas excluidas, borrar ajena (204) y que el promedio público cambie.

## 3. Frontend — `apps/frontend/client/src/`
*Cubre: RF-10 a RF-14.*

### Lógica (`src/logic/`, todo con tests)
- `adminApi.ts`: `fetchAdminOverview`, `fetchAdminProducts(query)`, `setProductFeatured(id, featured)`, `deleteAdminProduct(id)`, `fetchAdminUsers(query)`, `setUserRole(id, role)`, `fetchAdminReviews(query)`, `deleteAdminReview(id)`. Mismo patrón que `reviewApi.ts` (`buildUrl`, `credentials: "include"`, `readErrorBody`, `STATUS_MESSAGES`, respuesta validada con Zod, resultado `{ ok: true, … } | { ok: false, message, status }`).
- `adminQuery.ts`: leer y escribir los filtros de cada sección en `URLSearchParams` (valores inválidos se ignoran y se usa el default; cambiar un filtro borra `pagina`).
- `adminFormat.ts`: `formatRelativeTime(iso, now)` con `Intl.RelativeTimeFormat("es", { numeric: "auto" })` (minutos/horas/días), `formatRating(n | null)` ("4,2" o "—"), `describeActivity(event)` → `{ user, text }`, `categoryBars(byCategory)` → anchos en % y `aria-label`, `formatRange(pagina, porPagina, total)` → "Mostrando 21–40 de 57".
- Hooks: `useAdminOverview()`, `useAdminList(fetcher, query)` (estado `loading | error | ready`, `reload()`, y retroceso de página de RF-14).

### Componentes (`src/components/admin/`)
- `StatCard.tsx`, `CategoryBars.tsx`, `ActivityList.tsx`, `AdminProductsTable.tsx`, `FeaturedSwitch.tsx` (`button role="switch"`), `AdminUsersTable.tsx`, `RoleChangeDialog.tsx` (sobre `ui/alert-dialog`), `AdminReviewCard.tsx`, `StarRatingDisplay` (reutilizar el existente si su `aria-label` encaja), `AdminNotice.tsx` (`role="status"`, `✓ ok` en `terminal-success`), `SegmentedFilter.tsx` (grupo de botones con `aria-pressed`, usado en Productos y Reseñas).
- Reutilizar `ConfirmDeleteDialog` (props `title`, `description`, `confirmLabel`, `triggerAriaLabel`) y `CatalogPagination` si su API lo permite; si no, un `AdminPagination` simple.
- `resolveImageUrl` de `productImage.ts` para las miniaturas.

### Páginas (`src/pages/admin/`)
- `AdminOverviewPage.tsx` *(RF-10)*: guiño + encabezado + botón "Actualizar"; grilla de 4 `StatCard` (`grid-cols-[repeat(auto-fit,minmax(210px,1fr))]`); dos filas de dos tarjetas (`minmax(380px,1fr)` con `min()` para no desbordar en 360 px).
- `AdminProductsPage.tsx` *(RF-11)*, `AdminUsersPage.tsx` *(RF-12)*, `AdminReviewsPage.tsx` *(RF-13)*: filtros con `useSearchParams` + `adminQuery.ts`, lista con `useAdminList`, acciones con `adminApi.ts`, aviso con `AdminNotice`.

### Tests frontend
- `adminApi.test.ts` (con `test/apiStub.ts`): éxito, 401/403/404, respuesta inválida.
- `adminQuery.test.ts`, `adminFormat.test.ts`.
- Una prueba de página por sección con la API simulada: render de datos, una acción (destacar, cambiar rol, borrar reseña) y el aviso.

## 4. Decisiones
- **D1 — Un endpoint para el Resumen.** Una sola llamada simplifica estados de carga y error; las consultas son pocas y baratas para el tamaño de la tienda.
- **D2 — Rutas propias en `/api/admin` en vez de ampliar las públicas.** Las públicas tienen reglas de dueño (008, 010) que no hay que mezclar con permisos de administrador.
- **D3 — Borrar reseñas con el producto (RF-5).** Sin eso, los conteos y promedios del panel incluirían reseñas de productos inexistentes. Se arregla en el servicio compartido para ambos caminos.
- **D4 — No quitarse el rol a sí mismo.** Garantiza que siempre quede un administrador sin necesitar una regla de "último administrador".
- **D5 — Filtros en la URL.** Recargar, volver atrás o compartir la URL conserva la vista, igual que el catálogo (009).
- **D6 — Sin filtro "De usuarios" en Productos.** El mockup lo mostraba, pero depende de reconocer al vendedor del seed por nombre; la búsqueda por vendedor cubre ese caso.
