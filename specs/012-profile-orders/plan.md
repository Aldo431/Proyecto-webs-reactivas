# Plan 012 — Mis pedidos (sección en el perfil y creación al pagar)

Plan de implementación para la spec `012-profile-orders`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-10. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10.*

### `utils/` — esquemas compartidos (§1, §3)

- **`utils/src/orderSchemas.ts`** *(RF-3, RF-4, RF-5, RF-8, RF-9)* — módulo nuevo, exportado desde `utils/src/index.ts`:
  - `ORDER_MAX_QUANTITY = 999`, `ORDER_MAX_LINES = 50`.
  - `orderItemInputSchema`: `{ productId: z.string().trim().min(1) }`, `quantity: int 1..999`.
  - `createOrderInputSchema`: `{ items: array(1..50) }` (rechaza carrito vacío con mensaje en español).
  - `orderLineSchema` (público): `{ productId, name, image, unitPrice: int positivo, quantity, subtotal: int positivo }`.
  - `orderStatusSchema`: `z.literal("completado")`.
  - `orderSchema`: `{ id, folio: regex /^PED-\d{4}-\d{4,}$/, status, items: array(1..50), total: int positivo, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() }`.
  - `orderListSchema`: `z.array(orderSchema)`.
  - Tipos: `CreateOrderInput`, `OrderItemInput`, `OrderLine`, `Order`, `OrderList`.
- **`utils/src/orderSchemas.test.ts`** *(§4, RNF-8)* — ver §4.

### Presentación (React, solo UI) — `apps/frontend/client/src/`

- **`components/OrderCard.tsx`** *(RF-8)* — tarjeta de solo lectura de un pedido: folio en `font-mono`, fecha/hora en formato chileno, `Badge` "Completado" (RF-5), líneas (miniatura vía `resolveImageUrl`, nombre, `cantidad × precio unitario`, subtotal) y total. Sin botones de edición/cancelación (RF-8). Props tipadas (`order: Order`).
- **`components/PaymentSuccess.tsx`** *(RF-7)* — se extiende: nueva prop `folio: string`; muestra "Tu pedido {folio} quedó registrado." y un segundo botón `asChild` + `Link to="/perfil"` "Ver mis pedidos". "Volver a la tienda" se conserva.
- **`pages/PaymentPage.tsx`** *(RF-2, RF-6, RF-7)* — `handleSubmit` pasa a ser asíncrono: con el esquema Zod válido, deshabilita el botón "Pagar" con `aria-busy="true"` y `paying` en `true`, llama a `createOrder()` con las líneas del carrito; en éxito captura `{ total, folio }` como estado local `paidOrder` **antes** de `clearCart()`, descarta el formulario y renderiza el éxito; en fallo guarda `payError` (render como `role="alert"` dentro del formulario), conserva carrito y valores, y rehabilita el botón (RF-6). Sin llamadas de red de tarjeta en ningún caso (RF-10).
- **`pages/ProfilePage.tsx`** *(RF-1, RF-8, RF-9)* — nueva sección "Mis pedidos" en un `Card` (`id="perfil-pedidos"`, `aria-labelledby="perfil-pedidos-titulo"`) entre "Mi carrito" y "Favoritos" ([ASUMIDO] spec 012 RF-1): estado propio (`orders`, `ordersLoading`, `ordersError`, `ordersShowCount`); `useEffect` separado que llama a `fetchOrders()` al montar y **Reintentar** cuando falla; carga → texto "Cargando tus pedidos…"; error → `role="alert"` + botón "Reintentar"; vacío → "Aún no tienes pedidos." + `Button asChild` + `Link to="/catalogo"`; lista → `OrderCard` por pedido con los 5 más recientes y control "Ver más" (+5 por activación). Una columna, legible desde 360 px (RNF-7).
- **`components/index` / exports existentes** — sin cambios de convención; `OrderCard` se importa directo por ruta relativa como el resto.

### Lógica pura testeable — `apps/frontend/client/src/logic/`

- **`logic/orderApi.ts`** *(RF-2, RF-6, RF-9, RF-10, §3)* — `createOrder(items): Promise<CreateOrderResult>` y `fetchOrders(): Promise<OrdersResult>`, con el mismo patrón de `profileApi.ts` (`credentials: "include"`, `parseBody` con `orderSchema`/`orderListSchema`, `failureFromStatus`, `networkFailure()`):
  - `createOrder` envía **únicamente** `{ items: [{ productId, quantity }] }`; nunca precios ni datos de tarjeta (RF-10). Errores: 401/400/5xx → `{ ok: false, message }`; mensaje por defecto "No pudimos registrar tu pedido. Inténtalo de nuevo." (RF-6).
  - `fetchOrders` devuelve `{ ok: true, orders } | { ok: false, message }` para el estado error + reintento del perfil (RF-1, RF-9).
- **`logic/orderFormat.ts`** *(RF-8, §4)* — `formatOrderDate(iso: string): string` con `Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short" })`. Función pura con tests.

### Backend — `apps/backend/src/`

- **`models/Counter.ts`** *(RF-4, RNF-5)* — modelo `{ _id: string; value: number }` (colección `counters`). Un solo documento `_id: "orderFolio"` lleva la secuencia global de folios.
- **`models/Order.ts`** *(RF-3, RF-4, RF-5, RF-10)* — `OrderFields`: `user: ObjectId ref "User"` (index), `folio: string` (unique, index), `items` (subdocumentos embebidos sin `_id` propio: `product: ObjectId ref "Product"`, `name`, `image`, `unitPrice`, `quantity`, `subtotal`), `total: number`, `status: "completado"` (enum de un solo valor); `timestamps: true`. Validadores Mongoose como respaldo de los límites Zod (cantidad 1–999 máx 50 líneas, `unitPrice`/`subtotal`/`total` enteros positivos) y mensaje en español. Índices: `{ folio: 1 }` único; `{ user: 1, createdAt: -1, _id: -1 }` para el listado (RF-8, desempate estable).
- **`services/orderService.ts`** *(RF-2, RF-3, RF-4, RF-5, RF-10, §5)*:
  - `createOrder(userId, input)`:
    1. Cada `productId` validado con `isObjectIdString()` (importada de `productService.ts`); inválido → `HttpError(400, PRODUCT_UNAVAILABLE_MESSAGE)`.
    2. `Product.find({ _id: { $in: ids } })` con proyección propia `{ name: 1, price: 1, image: 1 }` — **sin `READ_PROJECTION`** (marcaría las imágenes data URL como `"data:"` y el snapshot del pedido quedaría roto).
    3. Algún producto inexistente → `HttpError(400, "Uno de los productos de tu carrito ya no está disponible.")`; nada se persiste (RF-3, RF-6).
    4. Folio: `Counter.findByIdAndUpdate("orderFolio", { $inc: { value: 1 } }, { returnDocument: "after", upsert: true, setDefaultsOnInsert: true })` atómico; `folio = PED-${new Date().getFullYear()}-${String(value).padStart(4, "0")}` (RF-4, RNF-5).
    5. Líneas y total calculados **aquí desde la base de datos** (RF-3, RNF-9); `Order.create({ user: userId, folio, items, total, status: "completado" })`. Ante E11000 (duplicado de folio imposible con `$inc`, respaldo ante datos heredados) se reintenta **una vez**; si persiste → `ConflictError("No se pudo asignar el folio del pedido. Inténtalo de nuevo.")` → `409`.
    6. Devuelve `toPublicOrder(order)`; `createdAt/updatedAt` vienen de timestamps (RF-3).
  - `listOrders(userId)`: `Order.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).lean()` → `toPublicOrder[]` (RF-8, RF-9).
- **`controllers/ordersController.ts`** *(RF-2, RF-9)* — `createOrderHandler` (POST): `requireUserId` propio (mismo patrón de `productsController.ts`), `createOrderInputSchema.parse(request.body)` (ZodError burbujea a `errorHandler` → `400` con `fieldErrors`), `201` con el pedido. `listOrdersHandler` (GET): `200` con el arreglo. Nunca lee `user` del cuerpo (RF-9).
- **`routes/ordersRoutes.ts`** — `ordersRoutes.get("/", requireAuth, listOrdersHandler)` y `ordersRoutes.post("/", requireAuth, createOrderHandler)`; `requireAuth` existente (`middleware/auth.ts`), `401` sin sesión (RF-9).
- **`app.ts`** — `app.use("/api/orders", ordersRoutes);` junto a las demás rutas.
- **`errors.ts`** — sin cambios (se reutiliza `HttpError(400, …)` y `ConflictError` como respaldo de folio; `errorHandler` ya mapea ambos a JSON con su código).
- **`services`/tests helpers** — se reutilizan `test/mongoMemory.ts` y las fixtures de `test/productFixtures.ts` (`createSeller`, `createProduct`); los pedidos se crean por la API en los tests de ruta o directamente vía servicio cuando convenga. `Order.syncIndexes()` y `Counter.syncIndexes()` en `beforeAll`.

## 2. Modelo de datos JSON
*Cubre: RF-3, RF-4, RF-5, RF-10.*

Contrato público (`POST /api/orders` → `201`; `GET /api/orders` → `200`); se valida con `orderSchema`/`orderListSchema` de `@tiendadcc/utils`:

```json
{
  "id": "6712a4f3c9b1e24a8f0d1235",
  "folio": "PED-2026-0007",
  "status": "completado",
  "items": [
    {
      "productId": "6712a4f3c9b1e24a8f0d1234",
      "name": "Taza DCC",
      "image": "/images/taza-dcc.png",
      "unitPrice": 6000,
      "quantity": 2,
      "subtotal": 12000
    }
  ],
  "total": 12000,
  "createdAt": "2026-11-17T22:41:03.512Z",
  "updatedAt": "2026-11-17T22:41:03.512Z"
}
```

(`status` es el literal `completado`; no viaja ningún dato de tarjeta ni de contacto de pago — RF-10. `image` guarda **verbatim** el campo `image` del producto al momento de la compra: ruta del seed o data URL; el pedido es autosuficiente porque el producto puede ser editado o eliminado después, RF-3. La imagen no se reduce ni se transforma en esta fase; los data URL ≤ 1 MB ya caben de sobra en el límite de 16 MB de Mongo.)

Cuerpo de creación (`POST /api/orders`), único payload permitido (RF-2, RF-10):

```json
{
  "items": [{ "productId": "6712a4f3c9b1e24a8f0d1234", "quantity": 2 }]
}
```

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Pedido persistente en Mongo con snapshot calculado en el servidor; solo `productId` + `quantity` viajan desde el cliente.**
- Justificación: la spec exige snapshot fiel e inmutable (RF-3), total y precios no manipulables (RNF-9) y ningún dato de pago en red (RF-10). El servidor lee los productos vigentes y copia nombre/imagen/precio; los precios del request ni siquiera existen en el esquema (`createOrderInputSchema` no los acepta). `(RF-2, RF-3, RF-10, RNF-9)`
- Alternativa descartada: **snapshot desde el body del cliente**. Permitiría a cualquiera pagar "Taza DCC" a $1; rompe RNF-9 y la constitución §5.
- Alternativa descartada: **referencia por `productId` y lectura del producto actual**. Contradice RF-3 (editar/eliminar el producto rompería pedidos históricos) y la propia decisión [RESUELTO] de snapshot.

**D2 — Folio con contador atómico en colección `counters` + índice único de respaldo.**
- Justificación: RF-4 y RNF-5 exigen correlativo legible (`PED-<año>-<n>`) único bajo concurrencia. `findByIdAndUpdate($inc)` con `upsert` es atómico en MongoDB y no requiere transacciones ni locks; el índice único de `folio` es la última línea de defensa (con reintento único ante E11000). `(RF-4, RNF-5)`
- Alternativa descartada: **folio derivado de `_id`/timestamp** (p. ej. base64 o sufijo aleatorio). No es correlativo ni "legible" como exige RF-4.
- Alternativa descartada: **transacción multi-documento (contador dentro del insert del pedido)**. Sobreingeniería para un contador de un solo documento; añade dependencia de replica set en tests (`mongodb-memory-server` standalone no soporta transacciones).
- Alternativa descartada: **contador por año** (`PED-2026-…` reiniciando cada año). Decisión [ASUMIDO] de la spec: correlativo global y continuo; el año solo antecede.

**D3 — `image` verbatim en el snapshot, fetch con proyección propia.**
- Justificación: RF-3 exige que el pedido sobreviva a la edición/eliminación del producto, lo que obliga a copiar la imagen dentro del pedido. Se evita `READ_PROJECTION` porque reemplazaría las data URL por el marcador `"data:"`, dejando la miniatura rota. Cost acceptable: ≤ 1 MB por imagen, límite de documento BSON 16 MB. `(RF-3)`
- Alternativa descartada: **guardar solo ruta/URL y re-resolver por `productId` con fallback a imagen del producto**. Si el producto se elimina, la miniatura desaparece; contradice RF-3 e invalida el caso límite "producto editado o eliminado".
- Alternativa descartada: **omitir la imagen del snapshot**. Incumple RF-8 ("miniatura si hay imagen") para productos cuyo `image` es siempre obligatorio por 008.

**D4 — El pago falla cerrado: orden primero, carrito y éxito después.**
- Justificación: la spec resuelve explícitamente que el fallo bloquea el pago (RF-6): error anunciable, carrito y formulario intactos, `paying` reseteado, botón habilitado. Se respeta el orden estricto crear pedido → `clearCart()` → éxito (RF-2); nunca se invoca `clearCart()` ni se monta `<PaymentSuccess>` si `createOrder` no devuelve `ok`. La pantalla de éxito recibe el `folio` real del pedido creado (RF-7). `(RF-2, RF-6, RF-7)`
- Alternativa descartada: **optimista: vaciar y mostrar éxito, luego crear en segundo plano**. Contradice RF-6 (nunca éxito sin pedido) y RF-7 (el éxito mostraría un folio inexistente).
- Alternativa descartada: **reintento automático silencioso**. Oculta fallos de red reales; la spec exige reintento explícito del usuario (RF-6).

**D5 — El estado del pago vive en `PaymentPage`, no en `CartContext` ni en estado global nuevo.**
- Justificación: §3 mantiene la lógica de compra dentro de la página de pago (como el mock actual). El pedido es un dato de servidor de un solo uso (se crea y se muestra); no amerita slice propio ni cambios en `useCart`/`AuthContext`. La llamada vive en `logic/orderApi.ts` (§3, RNF-4). `(RF-2, RF-6, RF-10)`
- Alternativa descartada: **guardar el pedido en `localStorage` y sincronizar después**. Permitiría pedidos "huérfanos" si la red falla; contradice RF-6 y RF-10; y persistiría datos de compra fuera del servidor, en contra de §5.
- Alternativa descartada: **extender `CartContext` con pedidos**. Acopla dominios; el carrito se vacía justo tras la compra y no hay suscriptor del pedido más allá de la pantalla de éxito.

**D6 — Sección "Mis pedidos" con estado local en `ProfilePage` + fetch propio, no dentro de `fetchProfile` ni del AuthContext.**
- Justificación: RF-1 exige carga/error/vacío propios; acoplar el fetch de pedidos a `fetchProfile()` rompería la carga independiente y duplicaría su manejo de error. Seguir el patrón existente de la página (hooks de datos locales + `useEffect` al montar, igual que `loadProfile`) minimiza el diff y respeta §3. `(RF-1, RF-9)`
- Alternativa descartada: **endpoint único `GET /api/users/me` ampliado con `orders`**. Rompería el contrato de `profileSchema` (005–007 lo consumen) y mezclaría lecturas; además los pedidos cambian con cada compra y conviene listarse frescos.
- Alternativa descartada: **usar `location.state.section === "pedidos"` y scroll automático como favoritos**. Útil pero innecesario en esta fase; el enlace "Ver mis pedidos" (RF-7) solo navega a `/perfil`.

**D7 — `GET /api/orders` sin paginación por servidor; "Ver más" +5 en el cliente.**
- Justificación: RF-1 [ASUMIDO] fija 5 visibles con +5 por activación, patrón "Ver más" del historial (007). Con volúmenes de curso (decenas de pedidos), traer todos en una llamada es simple y suficiente; el orden `createdAt` desc con índice lo respalda. `(RF-1, RF-8)`
- Alternativa descartada: **paginación por servidor con `?pagina=`**. Añade superficie (query schema, metadatos de total, estados de página) para un caso de uso que no lo exige; puede introducirse después sin romper el contrato.

**D8 — `OrderCard` como componente de presentación puro y lectura total vía Zod compartido.**
- Justificación: §3 (lógica fuera de la UI) y §4 (sin cobertura exigida a la presentación, sí a la lógica). La tarjeta solo recibe `order: Order` ya validado; formato de fecha en `logic/orderFormat.ts` con tests; `formatPriceCLP`/`resolveImageUrl` se reutilizan sin duplicar. `(RF-1, RF-8, RNF-4, RNF-6, RNF-7)`
- Alternativa descartada: **inline de la tarjeta dentro de `ProfilePage.tsx`**. Inflaría el componente (~700 líneas hoy) con más ramas de render; peor de testear y revisar.

**D9 — Sin dependencias nuevas; Mongoose y Zod existentes cubren todo.**
- Justificación: RNF-2 prohíbe explícitamente librerías nuevas (ni de folios ni de fechas). `Intl.DateTimeFormat("es-CL")` y `padStart` son nativos; el enum de estado se modela con `z.literal` y `enum` de Mongoose. `(RNF-2, §1)`
- Alternativa descartada: **`nanoid`/`uuid` para folio** y **`dayjs` para fechas**. Fuera de alcance (§1, RNF-2) y no aportan frente a la solución nativa.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 12.*

- **Lógica pura obligatoria (§4)** — `utils/src/orderSchemas.test.ts` *(Verifica RF-2, RF-3, RF-4, RF-5, RF-9)*:
  - `createOrderInputSchema` acepta 1 línea válida; rechaza `items: []`, `quantity: 0`, `quantity: 1.5`, `quantity: 1000`, `productId: ""` y `items` de más de 50 líneas.
  - `orderSchema` acepta un pedido válido; rechaza `status: "pendiente"`, folio sin patrón (`P-1`, `PED-2026-1 x`), `total: 0`, `createdAt` no-ISO.
  - `orderListSchema` valida un arreglo vacío y uno de varios pedidos.
  - `subtotal`/`total` enteros positivos; `unitPrice` entero positivo.
- **Backend (rutas con `mongodb-memory-server`, patrón `productsWriteRoutes.test.ts`)** — `src/routes/ordersRoutes.test.ts` *(Verifica RF-2, RF-3, RF-4, RF-5, RF-9, RF-10)*:
  - `POST /api/orders` sin cookie → `401` y `Order.countDocuments() === 0`.
  - `POST` válido → `201`; cuerpo con `folio` (`/^PED-\d{4}-0001$/`), `status: "completado"`, `subtotal`/`total` calculados desde la BD aunque el body envíe precios manipulados; dos pedidos creados consecutivos → `PED-…-0001`, `PED-…-0002`; con 50 pedidos previos, el 51º → `PED-…-0051` (padding ≥ 4 dígitos).
  - `POST` con `productId` inexistente o con `"no-es-object-id"` → `400` con mensaje español; ninguna línea ni pedido persistido.
  - `POST` con `quantity: 0` / `1000` / `items: []` → `400` (ZodError → fieldErrors).
  - Editar o borrar el producto tras la compra → el pedido conserva nombre/precio/imagen/subtotal originales.
  - `GET /api/orders` sin cookie → `401`; con sesión → `200` solo con los pedidos propios, ordenados por fecha desc; otro usuario recibe su propio arreglo vacío.
- **Frontend (fetch simulado)** — `src/logic/orderApi.test.ts` *(Verifica RF-2, RF-6, RF-9, RF-10)*:
  - `createOrder` envía exactamente `{ items: [{ productId, quantity }] }` (sin precios ni tarjetas: captura el body del stub de `fetch`); `201` → `{ ok: true, order }` validado contra `orderSchema`.
  - `400`/`500`/sin red → `{ ok: false, message }` no vacío; número de tarjeta no aparece en ningún cuerpo capturado.
  - `fetchOrders` `200` → lista validada; `401` → `{ ok: false }`.
- `src/logic/orderFormat.test.ts` *(Verifica RF-8)* — `formatOrderDate` devuelve texto no vacío que incluye el año (p. ej. `2026`) para `"2026-11-17T22:41:03.512Z"`.
- **Presentación (no exige cobertura, §4)** — `pages/PaymentPage.test.tsx` se actualiza: stub de `/api/orders` `201` con folio `PED-2026-0001`; tras "Pagar" válido se espera el éxito con el folio, carrito vacío (`localStorage` `"[]"`) y formulario desmontado; con `500` en `/api/orders` se espera error anunciable y el carrito/valores intactos; `pages/ProfilePage.test.tsx` (o flujo en existente): stub de `/api/orders` con lista → se renderizan folio/total/"Completado"; lista vacía → estado vacío; `500` → error + "Reintentar". `components/OrderCard.tsx` smoke vía esas páginas (sin test dedicado).
- **Verificación de contrato por QA (manual):** login real → agregar productos → `#/pago` → "Pagar" → éxito con folio → "Ver mis pedidos" → tarjeta con fecha, líneas y total → "Explorar catálogo". Apagar el backend y repetir "Pagar" → error, carrito intacto. Dos pagos consecutivos → folios `0001` y `0002`. Recarga de `#/pago` post-éxito → redirección a `/catalogo`.
- **Ausencia de APIs externas:** no hay pasarela ni servicios de terceros; todas las llamadas se simulan con `fetch` stub o `mongodb-memory-server`.
- **Comando de cierre:** `npm run check` (tipos + tests de `utils`, backend y frontend) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)
| Parte del plan | RF |
|---|---|
| `utils/src/orderSchemas.ts` (+ tests) | RF-2, RF-3, RF-4, RF-5, RF-9 |
| `models/Counter.ts`, `models/Order.ts` | RF-3, RF-4, RF-5, RF-10 |
| `services/orderService.ts` (folio atómico, snapshot server-side, 400 por producto inexistente) | RF-2, RF-3, RF-4, RF-9, RF-10 |
| `controllers/ordersController.ts`, `routes/ordersRoutes.ts`, `app.ts` | RF-2, RF-9 |
| `logic/orderApi.ts` (+ tests) | RF-2, RF-6, RF-9, RF-10 |
| `logic/orderFormat.ts` (+ tests) | RF-8 |
| `PaymentPage.tsx` (pago cerrado, `aria-busy`, error `role="alert"`) | RF-2, RF-6 |
| `PaymentSuccess.tsx` (folio + "Ver mis pedidos") | RF-7 |
| `pages/ProfilePage.tsx` (sección Mis pedidos, carga/error/vacío/ver más) | RF-1, RF-8, RF-9 |
| `components/OrderCard.tsx` | RF-1, RF-5, RF-8 |
| Verificación RF-1…RF-10 (Route tests + frontend stubs, §4) | verificación RF-1…RF-10 (§4) |

---

**Nota final:** las dudas abiertas de la spec se resuelven en implementación según lo [ASUMIDO] allí (folio `PED-<año>-<correlativo global ≥4 dígitos>`, sección tras "Mi carrito", "Ver más" +5, enlace "Ver mis pedidos", cantidad máx 999). El plan asume los valores más conservadores; si el equipo define otro formato de folio al implementar, se ajusta `orderSchemas.ts` y la regex en un solo paso. Al implementar se deben actualizar `specs/004-shopping-cart`, `specs/006-user-profile` y `specs/011-payment-form` para que reflejen este comportamiento ([PENDIENTE] de la spec 012). El siguiente paso es generar `tasks.md`.
