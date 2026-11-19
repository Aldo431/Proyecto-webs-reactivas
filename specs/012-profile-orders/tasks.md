# Tasks 012 — Mis pedidos (sección en el perfil y creación al pagar)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 012 del flujo de compra, perfil y backend**
    RF: RF-1…RF-10 (base para todo)
    Hecho cuando: conozco `PaymentPage.tsx` (flujo válido → `clearCart()` → `<PaymentSuccess>` en la misma ruta; redirección `paidTotal === null && items.length === 0` → `/catalogo`), `PaymentSuccess.tsx` (mensaje + monto + "Volver a la tienda"), `ProfilePage.tsx` (sección "Mi carrito" y "Favoritos" con sus `Card`, `loadProfile` único al montar, `favoritesSectionRef` para scroll), `profileApi.ts` (`parseBody` + `credentials: "include"` + `failureFromStatus`), `CartContext.tsx` (`clearCart` solo vacía y dispara el `PUT /api/users/me/cart` existente), `productService.ts` (`isObjectIdString`, `READ_PROJECTION` no usable para snapshots), `productsController.ts` (`requireUserId` propio, `schema.parse` → ZodError burbujea a `errorHandler`), `errorHandler.ts` (`HttpError` → JSON con su código; ZodError → `400` + `fieldErrors`), `middleware/auth.ts` (`requireAuth`, `401` sin sesión), `test/mongoMemory.ts` + fixtures de `productsWriteRoutes.test.ts`, `utils/src/profileSchemas.ts` como modelo de estilo, y que `specs/004-shopping-cart`, `specs/006-user-profile` y `specs/011-payment-form` quedan a actualizar con confirmación explícita.

## Fase 1 — Esquemas compartidos (depende de 1)

- [x] **2. Crear `utils/src/orderSchemas.ts` y exportarlo**
    RF: RF-2, RF-3, RF-4, RF-5, RF-9, RF-10 (más RNF-2, RNF-9)
    Hecho cuando: implemento `ORDER_MAX_QUANTITY = 999` y `ORDER_MAX_LINES = 50`, `orderItemInputSchema` (`productId` string trim ≥ 1, `quantity` entero 1–999), `createOrderInputSchema` (`items` array 1–50, error en español si está vacío) **sin** campos de precio ni de tarjeta, `orderLineSchema` (`productId`, `name`, `image`, `unitPrice`/`quantity`/`subtotal` enteros positivos), `orderStatusSchema` (`z.literal("completado")`), `orderSchema` (`id`, `folio` regex `^PED-\d{4}-\d{4,}$`, `status`, `items` 1–50, `total` entero positivo, `createdAt`/`updatedAt` `z.iso.datetime()`), `orderListSchema`, y los tipos `CreateOrderInput`, `OrderLine`, `Order`, `OrderList`; `index.ts` lo re-exporta y los tipos compilan.

- [x] **3. Tests unitarios de `orderSchemas.ts`**
    RF: RF-2, RF-3, RF-4, RF-5 (más RNF-8)
    Hecho cuando: `orderSchemas.test.ts` cubre aceptación de un pedido válido y rechazo de `items: []`, `items` de más de 50 líneas, `quantity` 0/1.5/1000, `productId` vacío, `status` distinto de `completado`, folio sin patrón (`P-1`, con espacio, sin prefijo `PED-`), `total`/`unitPrice` no enteros o ≤ 0 y `createdAt` no-ISO; `orderListSchema` valida arreglo vacío y lista de pedidos, y pasan.

## Fase 2 — Backend (depende de 2)

- [x] **4. Crear `models/Counter.ts` y `models/Order.ts`**
    RF: RF-3, RF-4, RF-5, RF-10 (más RNF-5)
    Hecho cuando: `Counter.ts` define `{ _id: string; value: number }` en la colección `counters`; `Order.ts` define `OrderFields` con `user` (ObjectId ref `User`, requerido, index), `folio` (string, requerido, **unique**), `items` embebidos sin `_id` (`product` ObjectId ref `Product`, `name`, `image`, `unitPrice`, `quantity`, `subtotal` con validadores Mongoose espejo de los límites Zod: cantidad 1–999, enteros positivos, máx 50 líneas), `total` (entero positivo) y `status` enum `["completado"]`, con `timestamps: true`; índices `{ folio: 1 }` unique y `{ user: 1, createdAt: -1, _id: -1 }`; y `toPublicOrder()` serializa `id`/`folio`/`status`/`items`/`total`/`createdAt`/`updatedAt` sin exponer `_id` de Mongoose.

- [x] **5. Crear `services/orderService.ts`**
    RF: RF-2, RF-3, RF-4, RF-9, RF-10 (más RNF-5, RNF-9)
    Hecho cuando: implemento `createOrder(userId, input)` que (1) valida cada `productId` con `isObjectIdString` y responde `HttpError(400, "Uno de los productos de tu carrito ya no está disponible.")` si no es válido u omite el producto, (2) lee los productos con proyección propia `{ name: 1, price: 1, image: 1 }` (no `READ_PROJECTION`), (3) toma el folio de forma atómica con `Counter.findByIdAndUpdate("orderFolio", { $inc: { value: 1 } }, { returnDocument: "after", upsert: true })` y lo arma `PED-<año actual>-<correlativo rellenado a ≥4 dígitos>`, reintentando una sola vez ante E11000 y lanzando `ConflictError("No se pudo asignar el folio del pedido. Inténtalo de nuevo.")` si persiste, (4) calcula subtotal y total desde la base de datos, (5) persiste con `status: "completado"` asociado a `userId` (nunca al body) y devuelve `toPublicOrder()`; e implemento `listOrders(userId)` con orden `createdAt` desc y desempate `_id`.

- [x] **6. Crear `controllers/ordersController.ts`, `routes/ordersRoutes.ts` y montar `/api/orders`**
    RF: RF-2, RF-9
    Hecho cuando: `ordersController.ts` define `requireUserId` propio (patrón de `productsController.ts`), `listOrdersHandler` (`200` con el arreglo; `401` sin sesión) y `createOrderHandler` (`createOrderInputSchema.parse(req.body)` con ZodError burbujeando a `errorHandler`, `201` con el pedido); `ordersRoutes.ts` registra `GET /` y `POST /` con `requireAuth` existente; en `app.ts` monto `app.use("/api/orders", ordersRoutes)`; y `errorHandler.ts` no requiere cambios (reviso que el `HttpError(400)` del servicio y el `ConflictError` respondan JSON con su código).

- [x] **7. Tests de backend `ordersRoutes.test.ts`**
    RF: RF-2, RF-3, RF-4, RF-5, RF-9, RF-10
    Hecho cuando: con `mongodb-memory-server`, `Order.syncIndexes()` y `Counter.syncIndexes()`, verifico `POST` sin cookie → `401` y cero pedidos persistidos; `POST` válido → `201` con `folio /^PED-\d{4}-\d{4}$/`, `status: "completado"`, subtotal/total calculados desde la BD aunque el body traiga precios manipulados (verifica RNF-9); segundo `POST` consecutivo → correlativo siguiente (padding ≥ 4 dígitos); `productId` inexistente o mal formado → `400` con el mensaje en español y nada persistido; `quantity: 0`/`1000`/`items: []` → `400`; tras editar/eliminar el producto comprado el pedido conserva el snapshot; `GET` sin cookie → `401`, con sesión → solo los pedidos propios ordenados del más reciente al más antiguo; otro usuario recibe su arreglo vacío; y los tests pasan.

## Fase 3 — Lógica frontend (depende de 1, 2)

- [x] **8. Crear `logic/orderApi.ts`**
    RF: RF-2, RF-6, RF-9, RF-10 (más RNF-4)
    Hecho cuando: implemento `createOrder(items)` que hace `POST /api/orders` con `credentials: "include"` y cuerpo **exclusivamente** `{ items: [{ productId, quantity }] }` (capturable en un test: sin precios ni ningún campo de tarjeta), valida la respuesta `201` con `orderSchema` y devuelve `{ ok: true, order } | { ok: false, message }` (mensaje por defecto "No pudimos registrar tu pedido. Inténtalo de nuevo." ante 401/400/5xx/sin red); e implemento `fetchOrders()` que hace `GET /api/orders` y devuelve `{ ok: true, orders } | { ok: false, message }` (mismo patrón de `profileApi.ts`), sin `any` injustificado.

- [x] **9. Crear `logic/orderFormat.ts`**
    RF: RF-8 (más RNF-6)
    Hecho cuando: implemento `formatOrderDate(iso: string): string` con `Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short" })` sin librerías nuevas y sin efectos secundarios.

- [x] **10. Tests de lógica `orderApi.test.ts` y `orderFormat.test.ts`**
    RF: RF-2, RF-6, RF-8, RF-10
    Hecho cuando: `orderApi.test.ts` verifica que el body de `createOrder` contiene solo `productId`/`quantity` (captura `fetch` simulado) y que un `201` se parsea con `orderSchema`, un `400`/`500`/fallo de red devuelve `{ ok: false }` con mensaje, `fetchOrders` `200` devuelve la lista validada y `401` `{ ok: false }`; `orderFormat.test.ts` verifica que `formatOrderDate("2026-11-17T22:41:03.512Z")` devuelve texto no vacío que contiene `2026` (sin depender de la zona horaria); y ambos pasan.

## Fase 4 — Infraestructura de UI (depende de 3, 8, 9, 10)

- [x] **11. Crear `components/OrderCard.tsx`**
    RF: RF-1, RF-5, RF-8
    Hecho cuando: renderizo una tarjeta de solo lectura (`Card` o superficie equivalente del sistema de diseño) con folio en `font-mono`, fecha con `formatOrderDate`, `Badge` "Completado" (RF-5), `<ul>` de líneas (miniatura `resolveImageUrl` si hay imagen, nombre, `cantidad × unitPrice`, subtotal por línea) y fila de Total con `formatPriceCLP`, con props tipadas `order: Order` (de `@tiendadcc/utils`), sin controles de editar/cancelar/eliminar, una columna legible desde 360 px y entrada por teclado.

- [x] **12. Extender `PaymentSuccess.tsx` con el folio y el enlace a pedidos**
    RF: RF-7
    Hecho cuando: `PaymentSuccess` acepta `folio` (string) y muestra "Tu pedido {folio} quedó registrado." junto a "¡Compra realizada con éxito!" y el monto ya existente; agrego un segundo botón `variant="outline"` con `asChild` + `Link to="/perfil"` "Ver mis pedidos" (conservando "Volver a la tienda" → `/`); ningún dato de tarjeta se muestra; y los tests de la página de pago siguen pasando tras actualizar sus props.

- [x] **13. Pago cerrado en `PaymentPage.tsx`: `aria-busy`, error y éxito con folio**
    RF: RF-2, RF-6, RF-7, RF-10
    Hecho cuando: `handleSubmit` es asíncrono; tras `paymentFormSchema` válido pongo `paying = true` y deshabilito el botón "Pagar" con `aria-busy="true"`, llamo a `createOrder` con `{ productId, quantity }` de `items`; en éxito capturo `{ total, folio }` como `paidOrder` **antes** de `clearCart()`, descarto los valores del formulario y renderizo `<PaymentSuccess totalPaid={…} folio={…} />`; en fallo guardo `payError` (renderizado como `role="alert"` dentro del formulario), **no** llamo a `clearCart()`, **conservo** correo/tarjeta/vencimiento/CVC/titular, pongo `paying = false` y el botón vuelve a ser presionable; el pedido y el éxito nunca aparecen sin respuesta 2xx del servidor.

- [x] **14. Sección "Mis pedidos" en `ProfilePage.tsx`**
    RF: RF-1, RF-8, RF-9 (más RNF-6, RNF-7)
    Hecho cuando: agrego un `Card` (`id="perfil-pedidos"`, `aria-labelledby="perfil-pedidos-titulo"`) entre "Mi carrito" y "Favoritos" con título "Mis pedidos", estado local (`orders`, `ordersLoading`, `ordersError`, `ordersShowCount` inicial 5) y un `useEffect` propio que llama a `fetchOrders()` al montar (independiente de `loadProfile`): carga → "Cargando tus pedidos…"; error → `role="alert"` + botón "Reintentar"; vacío → "Aún no tienes pedidos." + botón "Explorar catálogo" → `/catalogo`; lista → `OrderCard` del más reciente al más antiguo con los 5 más nuevos y control "Ver más" (+5 por activación); sin `id="perfil-pedidos"`/`Anterior/Siguiente` de paginación numérica; y la página queda operable por teclado con foco visible.

## Fase 5 — Integración y cierre (depende de 7, 11, 12, 13, 14)

- [x] **15. Actualizar los tests de frontend (`PaymentPage` y sección de perfil)**
    RF: RF-2, RF-6, RF-7, RF-8 (más RNF-8)
    Hecho cuando: `PaymentPage.test.tsx` stubbea `/api/orders` (`201` con `PED-2026-0001` y `500` según el caso); el test de éxito verifica el encabezado, el folio, el carrito vaciado (`localStorage` `"[]"`) y el formulario desmontado; el test de fallo (`500`) verifica error anunciable, carrito y valores intactos y botón rehabilitado; y añado/actualizo el test de la sección en `ProfilePage.test.tsx`: stub de `/api/orders` con lista → renderiza folio/total/"Completado"; lista vacía → "Aún no tienes pedidos."; `500` → error + "Reintentar"; todo pasa.

- [x] **16. Verificación QA en navegador**
    RF: RF-1…RF-10, RNF-6, RNF-7
    Hecho cuando: inicio sesión real con el seed (`vendedor@tiendadcc.cl`), agrego productos al carrito, pago en `#/pago` y verifico: éxito con "¡Compra realizada con éxito!" + folio (`PED-…`) y enlaces "Ver mis pedidos" → `/perfil` y "Volver a la tienda" → `/`; en `#/perfil` la tarjeta muestra folio, fecha en español, "Completado", líneas con subtotal y total; dos compras consecutivas generan folios correlativos; con el backend apagado, "Pagar" muestra el error y conserva carrito y formulario; carrito vacío al recargar `#/pago` → `#/catalogo`; 360 px sin scroll horizontal; teclado completo y consola limpia.

- [x] **17. Actualizar documentalmente `specs/004-shopping-cart`, `specs/006-user-profile` y `specs/011-payment-form`**
    RF: RNF-3, spec 012 (nota [PENDIENTE])
    Hecho cuando: con confirmación explícita del usuario, actualizo 004 (RF-9), 006 (nueva sección "Mis pedidos") y 011 (RF-7/RF-8/RNF-2, "Fuera de alcance" y criterios de finalización) para que reflejen el pedido persistido y la creación al pagar, sin tocar el código ni otras specs.

- [x] **18. Cierre: `npm run check` en verde**
    RF: RNF-4, RNF-8, criterio de finalización 12
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.

---
*Nota:* solo la Fase 0 queda hecha al generar este archivo; el resto está pendiente (`- [ ]`). La tarea 17 modifica specs existentes y por eso exige confirmación explícita del usuario (AGENTS.md), como la spec 011 documentó sobre 004. El siguiente paso es la implementación tarea a tarea, ejecutando `npm run check` al final de cada una conforme AGENTS.md.
