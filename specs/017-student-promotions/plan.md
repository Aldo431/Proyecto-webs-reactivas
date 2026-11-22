# Plan 017 — Promociones y packs para alumnos

Plan de implementación para la spec `017-student-promotions`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-5. Cada sección indica qué RF atiende. No se modifican las specs 015/016: su infraestructura (Zustand, router, E2E) se reutiliza tal cual y solo se amplía la suite E2E con archivos nuevos.

## 1. Estructura de módulos
*Cubre: RF-1 … RF-5.*

Se apoya en `authSchemas`/`orderSchemas` de `@tiendadcc/utils`, `requireAuth`/`requireAdmin` y `errorHandler` del backend, `User`/`Product`/`Order` de Mongoose, y en el frontend `authStore`, `cartStore`, `cartOperations`, `productApi` y `ProductDetailPage` (§3). La decisión de precios vive en una función pura compartida; los componentes solo presentan el resultado (RNF-3). Antes de tocar UI se aplica `specs/00-design-system/spec.md` (AGENTS.md).

- **Esquemas compartidos** — `utils/src/promotionSchemas.ts` (nuevo) *(RF-1, RF-2, RF-3, RF-4)*
  - Constantes `STUDENT_EMAIL_DOMAIN = "uchile.cl"`, `STUDENT_DISCOUNT_PERCENT = 20`, `OTP_LENGTH = 6`, `OTP_TTL_MS = 10 * 60 * 1000`, `OTP_MAX_ATTEMPTS = 5`.
  - `studentEmailSchema` (normaliza a minúsculas y valida el dominio) y `verificationRequestSchema` con `{ email }` *(RF-1)*.
  - `promotionTypeSchema = z.enum(["studentDiscount", "quantityPack3x2", "quantityPack2x15"])`; `promotionSchema` con `{ id, type, label, active, startsAt?, endsAt?, createdAt }` y `promotionInputSchema` con el porcentaje opcional acotado a 1–100 y `refine` de fechas invertidas *(RF-2)*.
  - `pricingLineSchema = { productId, variantId?, quantity }` y `pricingQuoteInputSchema = { items: min(1).max(ORDER_MAX_LINES) }` con `.strict()` para rechazar `price`, `unitPrice`, `subtotal` o `total` del cliente *(RF-3)*.
  - `discountSchema = { type, label, amount }` (monto entero CLP); `pricingLineResultSchema = { productId, variantId?, unitPrice, quantity, subtotal, discount: discountSchema.nullable() }`; `pricingQuoteSchema = { subtotal, discounts: array(discountSchema), total, savings }` *(RF-3, RF-4)*.
  - Extensión de `orderLineSchema` con `discount: discountSchema.nullable().default(null)` para conservar el desglose en el snapshot *(RF-4)*. Reexport desde `utils/src/index.ts`.

- **Lógica pura de descuentos** — `utils/src/pricing.ts` (nuevo) *(RF-3, RF-4)*
  - `normalizeEmail(email)` y `isStudentEmail(email)` *(RF-1)*.
  - `bestDiscountForLine(unitPrice, quantity, options: { isStudent: boolean; promotions: Promotion[] })`: calcula los montos de 20% alumno, `floor(quantity / 3) * unitPrice` para 3x2 y `round(unitPrice * quantity * 0.15)` para 2x15%; devuelve el de mayor monto, o `null` si ninguno aplica. Todo entero CLP con `Math.round`. *(RF-3)*
  - `calculatePricingQuote(lines, promotions, isStudent)`: función pura que recibe precios ya resueltos por el backend y devuelve `PricingQuote`; es la **única** fuente de la regla de no acumulación. *(RF-3, RF-4)*
  - Tests obligatorios de cada función (§4).

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4)*
  - `models/Promotion.ts` (nuevo): `type`, `label`, `active` (default `true`), `startsAt`/`endsAt` opcionales, `timestamps`; índice `{ active: 1, startsAt: 1, endsAt: 1 }` y validadores de respaldo. `toPublicPromotion` serializa el contrato de `utils` *(RF-2)*.
  - `models/User.ts` (modificar): campos `studentVerified: boolean` (default `false`), `studentCodeHash: string | null`, `studentCodeExpiry: Date | null`, `studentCodeAttempts: number` (default `0`). `toPublicJSON` y `toProfileJSON` exponen `studentVerified` *(RF-1)*. `toPublicJSON` no expone el código ni su hash (RNF-5).
  - `services/studentVerificationService.ts` (nuevo): `requestStudentCode(user, email)` valida dominio, genera 6 dígitos con `crypto.randomInt`, guarda `createHash("sha256")` del código con expiración y attempting a cero, envía el correo y devuelve `devCode` cuando `NODE_ENV !== "production"`. `confirmStudentCode(user, code)` compara hashes en tiempo constante con `timingSafeEqual`, incrementa intentos, invalida a los 5 fallos, limpia el código al acertar y fija `studentVerified` *(RF-1)*.
  - `controllers/studentController.ts` y `routes/studentRoutes.ts` (nuevos): `POST /api/students/verify` y `POST /api/students/confirm`, ambos con `requireAuth`; el primero con `studentCodeRateLimit` derivado de `emailRateLimit` de `middleware/rateLimit.ts` *(RF-1)*.
  - `services/promotionService.ts` (nuevo): `listActivePromotions(now)`, `createPromotion`, `updatePromotion`, `deactivatePromotion` y `seedDefaultPromotions()` (tres registros: 20% alumno, 3x2, 2x15%). Traduce duplicados/inexistente a `ConflictError`/`HttpError(404, ...)` *(RF-2)*.
  - `controllers/promotionsController.ts` y `routes/promotionsRoutes.ts` (nuevos): `GET /` público; `POST /`, `PATCH /:id`, `DELETE /:id` con `requireAuth` + `requireAdmin` *(RF-2)*.
  - `services/pricingService.ts` (nuevo): `quoteForUser(userId, input)` resuelve las líneas contra `Product` (proyección `{ name, price, variants }`, reutiliza `isObjectIdString`), valida stock de la variante seleccionada, calcula `unitPrice = product.price + priceAdjustment`, consulta `listActivePromotions`, comprueba `studentVerified && isStudentEmail(user.email)` y delega en `calculatePricingQuote`. Devuelve `{ quote, lines }` para reutilizar en el checkout *(RF-3, RF-4)*.
  - `controllers/pricingController.ts` y `routes/pricingRoutes.ts` (nuevos): `POST /api/pricing/quote` con `requireAuth` opcional — para anónimos se cotiza sin descuento de alumno; se usa `optionalAuth` nuevo en `middleware/auth.ts` que no rechaza la petición *(RF-3)*.
  - `services/orderService.ts` (modificar): dentro de la transacción existente, sustituir el cálculo `unitPrice * quantity` por los resultados de `quoteForUser`/`calculatePricingQuote`, guardar `discount` en cada `OrderItemFields` y usar el total devuelto. El stock se sigue descontando con el `$inc` actual *(RF-4)*.
  - `models/Order.ts` y `utils/src/orderSchemas.ts` (modificar): agregar `discount` opcional al item y a `toPublicOrder` *(RF-4)*.
  - `services/profileService.ts` (modificar): si `updateProfileData` cambia el correo, poner `studentVerified: false` y limpiar `studentCode*` para que un correo nuevo no herede el beneficio *(RF-1, RF-3)*.
  - `scripts/seed.ts` (modificar): invocar `seedDefaultPromotions()` después de crear productos *(RF-2)*.
  - `controllers/testingController.ts` (modificar): borrar también `promotions` y limpiar los campos de verificación de `User` *(RF-2, RNF-4)*.
  - `app.ts` (modificar): montar `/api/students`, `/api/promotions` y `/api/pricing` junto a las rutas actuales.

- **Lógica pura del frontend** — `apps/frontend/client/src/logic/` *(RF-1, RF-3, RF-5)*
  - `studentApi.ts` (nuevo): `requestStudentCode(email)` y `confirmStudentCode(code)` con el patrón de resultado discriminado de `authApi.ts` (`{ ok: true, devCode? } | { ok: false, message, fieldErrors? }`) y `credentials: "include"` *(RF-1)*.
  - `pricingApi.ts` (nuevo): `fetchQuote(items)` valida la respuesta con `pricingQuoteSchema` y traduce 400/503 a mensajes en español *(RF-3)*.
  - `usePricingQuote.ts` (nuevo): hook con estado discriminado `loading | error | success`, que vuelve a cotizar cuando cambian `cartStore.items` o `studentVerified`, con guardia `isCurrent` para respuestas tardías; expone `retry` *(RF-3, RF-5)*.
  - `promotionFormat.ts` (nuevo, puro): `promotionBadge(promotion)` devuelve la etiqueta en español y `canShowStudentHint(email, studentVerified)` decide cuándo mostrar el aviso de verificación *(RF-5)*.

- **Presentación** — `apps/frontend/client/src/components/` y `pages/` *(RF-1, RF-5)*
  - `components/PromotionBadge.tsx` (nuevo): `Badge` de `ui/` con la insignia; usa tokens semánticos y `font-mono` para el porcentaje *(RF-5)*.
  - `components/StudentVerificationCard.tsx` (nuevo): tarjeta con correo, botón "Enviar código", campo de 6 dígitos y confirmación; mensajes de error accesibles (`role="alert"`); si la API devuelve `devCode` en desarrollo, lo muestra como ayuda al desarrollo *(RF-1, RF-5)*.
  - `components/CartSummary.tsx` (nuevo): recibe `quote` y muestra `subtotal`, ahorro y total con `formatPriceCLP`, sin recalcular montos *(RF-5)*.
  - `pages/ProductDetailPage.tsx` (modificar): insignias de promociones vigentes y aviso de verificación para correos `@uchile.cl` no verificados *(RF-5)*.
  - `pages/CatalogPage.tsx` / `components/ProductCard.tsx` (modificar): insignia de pack en la tarjeta *(RF-5)*.
  - `components/CartDrawer.tsx` y `pages/CheckoutPage.tsx` (modificar): usar `CartSummary` con la cotización del servidor; el checkout sigue enviando solo `productId`/`variantId`/`quantity` *(RF-4, RF-5)*.
  - `pages/ProfilePage.tsx` (modificar): sección "Cuenta de alumno" con `StudentVerificationCard` y estado verificado *(RF-1, RF-5)*.
  - `authStore.ts` (modificar): acción `refresh` ya trae `studentVerified` del `/api/auth/me`; el selector de sesión lo expone a la UI *(RF-1)*. No se crea un tercer store (spec 015, RF-4).

## 2. Modelo de datos JSON
*Cubre: RF-1, RF-2, RF-3, RF-4.*

No cambia el formato de `products.json`. Se agrega la colección `promotions` y tres contratos nuevos; los valores de usuario van en español y las claves en inglés (§6). Los esquemas Zod de `utils/` validan todas las formas antes de usarse (AGENTS.md).

Promoción sembrada (tres registros, uno por tipo):

```json
{
  "id": "68f1c2a9b3d4e5f60718293a",
  "type": "studentDiscount",
  "label": "20% de descuento para alumnos",
  "active": true,
  "startsAt": null,
  "endsAt": null,
  "createdAt": "2026-11-22T12:00:00.000Z"
}
```

Cotización (`POST /api/pricing/quote`):

```json
{
  "items": [
    { "productId": "68f1c2a9b3d4e5f60718293b", "variantId": null, "quantity": 3 }
  ]
}
```

Respuesta:

```json
{
  "subtotal": 45000,
  "discounts": [{ "type": "quantityPack3x2", "label": "Pack 3x2", "amount": 15000 }],
  "total": 30000,
  "savings": 15000
}
```

Línea del pedido con desglose (snapshot):

```json
{
  "productId": "68f1c2a9b3d4e5f60718293b",
  "unitPrice": 15000,
  "quantity": 3,
  "subtotal": 30000,
  "discount": { "type": "quantityPack3x2", "label": "Pack 3x2", "amount": 15000 }
}
```

(El servidor ignora cualquier monto enviado por el cliente: `pricingQuoteInputSchema` usa `.strict()` y `createOrderInputSchema` ya descarta claves desconocidas. Los códigos de verificación nunca se serializan: solo se guarda su hash — RNF-5.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Función pura `calculatePricingQuote` compartida entre cotización y checkout.**
- Justificación: RF-3 y RF-4 exigen que el precio mostrado y el cobrado usen la misma regla; §3 pide lógica separada de la UI y RNF-4 exige tests de lógica pura.
- Alternativa descartada: **Calcular en el controlador de cotización y repetir el código en `orderService`**. Duplica la regla de no acumulación y permite que diverge tras un cambio de promociones.

**D2 — El cliente envía solo identificadores y cantidades; `.strict()` rechaza montos.**
- Justificación: RNF-5 prohíbe confiar en precios del navegador; `createOrderInputSchema` (spec 012) ya aplica este principio y RF-3 lo extiende a la cotización.
- Alternativa descartada: **Aceptar `price` y compararlo con la BD**. Acepta un vector de manipulación y hace más difícil probar la fuente de verdad.

**D3 — Descuento no acumulable: se aplica el mayor monto por línea.**
- Justificación: decisión cerrada con el usuario y RF-3; calcular los tres montos y quedarse con el máximo es determinista y fácil de testear, incluso con redondeo CLP.
- Alternativa descartada: **Acumular 20% + pack**. Requiere definir orden de aplicación y base de cálculo, y puede superar el 50% en combinaciones comunes.

**D4 — Códigos de 6 dígitos hasheados con SHA-256 y comparación en tiempo constante.**
- Justificación: RNF-5 exige no almacenar el código en claro; `crypto.timingSafeEqual` evita filtrar el código por tiempo de respuesta, y el patrón es análogo al `resetToken` existente (spec 010).
- Alternativa descartada: **Guardar el código en texto plano y comparar con `===`**. Expone el código a cualquier lectura de la base y es vulnerable a timing.

**D5 — Reutilizar `emailService` con un método `sendStudentCodeEmail` y `devCode` no-productivo.**
- Justificación: RNF-2 prohíbe nuevas dependencias; `emailService` ya abstrae el bypass de consola en desarrollo y el envío SMTP en producción, igual que `devToken` de recuperación.
- Alternativa descartada: **Instalar un proveedor de OTP externo**. Agregaría una dependencia no sancionada y un servicio del que depende la entrega.

**D6 — `optionalAuth` para la cotización de visitantes.**
- Justificación: RF-5 permite ver precios con packs en catálogo sin sesión, pero RF-3 exige descuento de alumno solo a usuarios verificados; un middleware opcional mantiene una sola ruta.
- Alternativa descartada: **Dos endpoints, público y autenticado**. Duplica la lógica de cotización y obliga a la UI a elegir según la sesión.

**D7 — Promociones persistidas en Mongo con CRUD admin, no constantes en código.**
- Justificación: RF-2 pide activar/desactivar sin tocar código; el seed crea valores por defecto, pero un administrador puede cambiarlos en producción.
- Alternativa descartada: **Constantes `STUDENT_DISCOUNT_PERCENT` fijas en `utils/`**. Cumple los valores actuales pero hace imposible desactivar una campaña sin desplegar.

**D8 — `studentVerified` se resetea al cambiar el correo en `updateProfileData`.**
- Justificación: RF-1/RF-3 exigen que la elegibilidad dependa del correo **actual**; el perfil permite cambiarlo (spec 006) y heredarlo sería un descuento indebido.
- Alternativa descartada: **Confiar solo en el flag**. Un usuario verificado podría cambiar su correo y conservar el 20%.

**D9 — La UI consume la cotización; `cartCalculations.ts` sigue intacto para el carrito base.**
- Justificación: RF-5 prohíbe calcular el total con descuento en el navegador; mantener `cartCalculations.ts` evita romper los stores y tests de la spec 015.
- Alternativa descartada: **Reimplementar los descuentos en `cartCalculations.ts`**. Duplica la regla en el cliente y expone los porcentajes a manipulación.

**D10 — Extender `orderLineSchema` con `discount` en vez de un campo nuevo en `Order`.**
- Justificación: RF-4 pide conservar el desglose por línea en el snapshot; el contrato público de pedidos (spec 012) ya expone cada línea, y un campo opcional con default `null` es retrocompatible con pedidos históricos.
- Alternativa descartada: **Guardar el desglose solo en `Order.discounts` global**. Pierde la asociación línea-descuento y obliga a migrar pedidos anteriores.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 8.*

- **Lógica pura obligatoria (§4):**
  - `utils/promotionSchemas.test.ts`: dominio `@uchile.cl` acepta mayúsculas/espacios y rechaza `gmail.com`; porcentaje 1–100 y rechazo de 0/101; tipo desconocido; fechas invertidas; `pricingQuoteInputSchema` acepta líneas válidas y rechaza `price`/`total` con `.strict()`. *(Verifica RF-1, RF-2, RF-3)*
  - `utils/pricing.test.ts`: `isStudentEmail` con dominio normalizado; `bestDiscountForLine` para 20% alumno, 3x2 con cantidades 1/2/3/6, 2x15% con 1/2/4, ventaja del mayor monto, sin descuento sin promociones, redondeo CLP y variante con `priceAdjustment`; `calculatePricingQuote` con varias líneas y `savings` agregado. *(Verifica RF-3, RF-4)*
- **Backend (supertest + `mongodb-memory-server`):**
  - `routes/studentRoutes.test.ts`: 401 sin sesión; 400 correo no `@uchile.cl`; 202 con `devCode` en test; confirmación correcta marca `studentVerified`; código erróneo/expirado 400; 5 fallos → 429; cambio de correo en perfil resetea el flag. *(Verifica RF-1)*
  - `routes/promotionsRoutes.test.ts`: seed de tres promociones; 403 no-admin; 201 con datos válidos; 400 con porcentaje/tipo/fechas inválidos; listado solo vigentes; PATCH y DELETE desactivan. *(Verifica RF-2)*
  - `routes/pricingRoutes.test.ts`: 200 con desglose; 400 si el cuerpo trae `price`; 400 producto/variante inexistente o stock insuficiente; anónimo sin descuento de alumno; usuario verificado con 20%. *(Verifica RF-3)*
  - `routes/ordersRoutes.test.ts` (ampliar): el pedido guarda `discount`, el total coincide con la cotización y los pedidos antiguos sin `discount` siguen validando. *(Verifica RF-4)*
- **Presentación (smoke tests):**
  - `logic/studentApi.test.ts` y `logic/pricingApi.test.ts`: éxito, errores 400/401/429 y validación de respuestas con Zod (fetch simulado). *(Verifica RF-1, RF-3)*
  - `logic/usePricingQuote.test.ts`: carga, recotización al cambiar `items`/`studentVerified`, error con `retry` y descarta respuestas tardías. *(Verifica RF-5)*
  - `logic/promotionFormat.test.ts` y `components/PromotionBadge.test.tsx`: etiquetas en español y aviso solo para correos U. de Chile no verificados. *(Verifica RF-5)*
- **Verificación de contrato por QA (manual):** verificar correo desde el perfil, recargar y comprobar que el 20% sigue aplicado; cambiar el correo y ver que desaparece; probar packs 3x2 y 2x15%; comparar total del carrito con el del pedido; 360 px y navegación solo con teclado.
- **Ausencia de red / mocking:** rutas con `mongodb-memory-server`; correo con el bypass de `emailService` en test; frontend con `fetch` simulado.
- **Comando de cierre:** `npm run check` (tipos + tests en los tres workspaces) en verde; además `npm run e2e` con los casos nuevos.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `studentSchemas`, `studentVerificationService`, `studentRoutes`, `StudentVerificationCard`, reset de `studentVerified` en perfil | RF-1 |
| `promotionSchemas`, `Promotion`, `promotionService`, CRUD admin, seed y `testingController` | RF-2 |
| `pricingSchemas`, `pricing.ts`, `pricingService`, `pricingRoutes`, `pricingApi`, `usePricingQuote`, `optionalAuth` | RF-3 |
| `orderService` + `discount` en `Order`/`orderSchemas` y `toPublicOrder` | RF-4 |
| `PromotionBadge`, `CartSummary`, integración en detalle/catálogo/carrito/checkout/perfil y `promotionFormat` | RF-5 |
| Tests de esquemas, lógica pura, rutas, hooks y componentes | Verificación RF-1 a RF-5 (§4) |

---
*Nota:* La spec no deja dudas abiertas: valores de descuento, acumulación, verificación por correo y fuera de alcance quedaron resueltos antes de redactarla. El plan asume los valores más conservadores (códigos hasheados, `.strict()` en la entrada, `discount: null` retrocompatible) y no modifica specs existentes. El siguiente paso según el flujo es generar `specs/017-student-promotions/tasks.md`.
