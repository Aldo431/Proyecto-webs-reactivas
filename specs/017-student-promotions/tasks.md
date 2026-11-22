# Tasks 017 — Promociones y packs para alumnos

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 017 de los puntos de integración**
    RF: RF-1…RF-5 (base para todo)
    Hecho cuando: conozco `authSchemas`/`orderSchemas` de `@tiendadcc/utils`, `requireAuth`/`requireAdmin`/`errorHandler` y `rateLimit.ts` del backend, `User`/`Product`/`Order` de Mongoose, `profileService`, `orderService`, `app.ts`, `emailService`, `authStore`/`cartStore`, `cartCalculations`, `authApi`, `CartDrawer`, `CheckoutPage`, `ProductDetailPage`, `ProfilePage`, los patrones de tests de la spec 010, el design system (`specs/00-design-system/spec.md`) y dónde aterriza cada módulo del plan.

## Fase 1 — utils: esquemas y lógica pura (depende de 1)

- [ ] **2. Esquemas Zod de promociones y verificación**
    RF: RF-1, RF-2, RF-3
    Hecho cuando: `utils/src/promotionSchemas.ts` exporta `STUDENT_EMAIL_DOMAIN`, `STUDENT_DISCOUNT_PERCENT`, `OTP_LENGTH`, `OTP_TTL_MS`, `OTP_MAX_ATTEMPTS`, `normalizeEmail`/`isStudentEmail`, `verificationRequestSchema`, `promotionTypeSchema`, `promotionSchema`, `promotionInputSchema` (porcentaje 1–100 y fechas no invertidas), `pricingLineSchema`, `pricingQuoteInputSchema` con `.strict()`, `discountSchema` y `pricingQuoteSchema`, todo reexportado desde `index.ts`, y sus tests (dominio, porcentaje, tipo, fechas y rechazo de `price`/`total`) pasan con `npm run check -w @tiendadcc/utils`.

- [ ] **3. Función pura de descuentos**
    RF: RF-3, RF-4
    Hecho cuando: `utils/src/pricing.ts` implementa `bestDiscountForLine(unitPrice, quantity, options)` y `calculatePricingQuote(lines, promotions, isStudent)` con montos enteros CLP, no acumulación (se elige el mayor monto), reglas 20% alumno / 3x2 / 2x15% y `savings` agregado, y sus tests (cantidades 1/2/3/6, ventaja del mayor, sin promociones, `priceAdjustment` y redondeo) pasan.

- [ ] **4. Extender el contrato público de pedidos**
    RF: RF-4
    Hecho cuando: `orderLineSchema` acepta `discount: discountSchema.nullable().default(null)` sin romper pedidos históricos, los tipos `OrderLine`/`Order` se reexportan igual y `npm run check -w @tiendadcc/utils` compila.

## Fase 2 — backend (depende de 2, 3, 4)

- [ ] **5. Modelo `Promotion` y seed por defecto**
    RF: RF-2
    Hecho cuando: `models/Promotion.ts` define `type`, `label`, `active`, `startsAt`/`endsAt` opcionales y `timestamps` con índice de vigencia, `toPublicPromotion` serializa el contrato de `utils`, y `seedDefaultPromotions()` crea exactamente tres promociones activas (20% alumno, 3x2, 2x15%) al ejecutar el seed sobre una base vacía.

- [ ] **6. Campos de verificación en `User` y reset al cambiar correo**
    RF: RF-1, RF-3
    Hecho cuando: `models/User.ts` agrega `studentVerified`, `studentCodeHash`, `studentCodeExpiry` y `studentCodeAttempts` sin exponer el hash en `toPublicJSON`/`toProfileJSON`, `profileService.updateProfileData` resetea `studentVerified` y limpia el código cuando cambia el correo, y los tests del modelo y del perfil pasan.

- [ ] **7. Servicio de verificación de alumno**
    RF: RF-1
    Hecho cuando: `studentVerificationService.requestStudentCode` valida el dominio `@uchile.cl` normalizado, genera 6 dígitos con `crypto.randomInt`, guarda SHA-256 del código con expiración de 10 minutos y devuelve `devCode` solo si `NODE_ENV !== "production"`; `confirmStudentCode` compara con `timingSafeEqual`, incrementa intentos, invalida a los 5 fallos, limpia el código y fija `studentVerified`, con tests unitarios del ciclo completo.

- [ ] **8. Correo de verificación y rutas de alumno**
    RF: RF-1
    Hecho cuando: `emailService.sendStudentCodeEmail` reutiliza el bypass de consola en desarrollo/test y SMTP en producción, `studentRoutes` monta `POST /api/students/verify` y `/confirm` con `requireAuth` y rate limit por correo, `app.ts` monta `/api/students`, y `npm run check -w backend` compila.

- [ ] **9. CRUD de promociones para administradores**
    RF: RF-2
    Hecho cuando: `promotionService` implementa listado vigente, creación, edición, desactivación y traducción de errores, `promotionsRoutes` expone `GET /` público y `POST`/`PATCH`/`DELETE` con `requireAuth` + `requireAdmin`, `app.ts` monta `/api/promotions`, y sus tests de integración (`201`/`400`/`403`/vigencia) pasan.

- [ ] **10. Cotización de precios en servidor**
    RF: RF-3
    Hecho cuando: `middleware/auth.ts` exporta `optionalAuth` sin rechazar anónimos, `pricingService.quoteForUser` resuelve productos/variantes contra la BD, valida stock, calcula `unitPrice` con `priceAdjustment`, consulta promociones vigentes y delega en `calculatePricingQuote`, y `pricingRoutes` monta `POST /api/pricing/quote` con validación `.strict()`.

- [ ] **11. Tests de cotización**
    RF: RF-3
    Hecho cuando: con supertest + `mongodb-memory-server` verifico `200` con desglose para alumno verificado, anónimo sin 20%, packs 3x2 y 2x15%, `400` si el cuerpo trae `price`/`total`, `400` por producto/variante inexistente o stock insuficiente, y `npm run check -w backend` pasa.

- [ ] **12. Descuento aplicado en el checkout**
    RF: RF-4
    Hecho cuando: `orderService` usa la misma función pura dentro de la transacción existente, guarda `discount` por línea en `models/Order.ts` y lo expone `toPublicOrder`, el total coincide con la cotización del servidor, el stock sigue descontándose con `$inc`, y los tests de pedidos (incluidos históricos sin `discount`) pasan.

- [ ] **13. Reinicio de datos de la feature en tests E2E**
    RF: RF-2, RNF-4
    Hecho cuando: `testingController` borra también `promotions` y limpia los campos `studentCode*`/`studentVerified` de `User` en `POST /api/testing/reset`, respondiendo `204`, y la ruta sigue sin existir fuera de `NODE_ENV=test`.

- [ ] **14. Tests de rutas de verificación**
    RF: RF-1
    Hecho cuando: con supertest verifico `401` sin sesión, `400` para correo no `@uchile.cl`, `202` con `devCode` en test, confirmación correcta, código erróneo/expirado `400`, 5 fallos → `429`, y que cambiar el correo en el perfil quita el beneficio.

## Fase 3 — cliente API y lógica (depende de 2, 3, 9, 10)

- [ ] **15. Clientes API `studentApi` y `pricingApi`**
    RF: RF-1, RF-3
    Hecho cuando: ambos usan `credentials: "include"`, resultados discriminados y validación Zod de respuestas, traducen `400`/`401`/`429`/`503` a mensajes en español, y sus tests con `fetch` simulado pasan.

- [ ] **16. Hook `usePricingQuote` y formato de promociones**
    RF: RF-3, RF-5
    Hecho cuando: `usePricingQuote` mantiene estados `loading`/`error`/`success`, vuelve a cotizar al cambiar `cartStore.items` o `studentVerified`, descarta respuestas tardías y expone `retry`; `promotionFormat.ts` genera insignias en español y decide el aviso de verificación, con tests que pasan.

## Fase 4 — UI (depende de 15, 16)

- [ ] **17. Componentes de UI de promociones**
    RF: RF-1, RF-5
    Hecho cuando: `PromotionBadge` usa `Badge`/tokens del design system, `StudentVerificationCard` permite enviar y confirmar el código de 6 dígitos con errores accesibles (`role="alert"`) y muestra `devCode` solo en desarrollo, y `CartSummary` presenta `subtotal`/ahorro/`total` sin recalcular montos, con smoke tests que pasan.

- [ ] **18. Integración en catálogo, detalle y perfil**
    RF: RF-1, RF-5
    Hecho cuando: `ProductCard` y `ProductDetailPage` muestran las insignias de promociones vigentes, el detalle ofrece el enlace de verificación a correos `@uchile.cl` no verificados, `ProfilePage` incluye la sección "Cuenta de alumno" y `authStore` expone `studentVerified` desde `/api/auth/me` sin crear un tercer store, y los tests existentes siguen pasando.

- [ ] **19. Integración en carrito y checkout**
    RF: RF-4, RF-5
    Hecho cuando: `CartDrawer` y `CheckoutPage` muestran el total y el ahorro devueltos por `usePricingQuote`, el checkout sigue enviando solo `productId`/`variantId`/`quantity`, y un fallo de cotización muestra un mensaje en español sin total de $0.

- [ ] **20. Tests de UI y lógica frontend**
    RF: RF-1, RF-3, RF-5
    Hecho cuando: pasan los tests de `studentApi`/`pricingApi`, `usePricingQuote`, `promotionFormat`, `PromotionBadge`, `StudentVerificationCard` y `CartSummary`, y `npm run check -w tiendadcc-client` compila sin `any`.

## Fase 5 — E2E, QA y cierre (depende de 13, 19, 20)

- [ ] **21. Ampliación de la suite E2E**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: `e2etests/helpers.ts` incorpora un usuario `...@uchile.cl` y ayudas de verificación con `devCode`, y el nuevo `promotions.spec.ts` documenta flujos con selectores accesibles, base reiniciada y `npm run e2e` verde.

- [ ] **22. Verificación QA según criterios de finalización**
    RF: RF-1…RF-5, RNF-1…RNF-6
    Hecho cuando: verifico contra MongoDB local que el código verifica alumnos, el 20% aparece y desaparece al cambiar el correo, los packs 3x2 y 2x15% se aplican sin acumularse, el total del carrito coincide con el del pedido, un admin activa/desactiva promociones, no se agregaron dependencias ni se tocó el design system, y 360 px y teclado funcionan sin scroll horizontal ni consola con errores.

- [ ] **23. Cierre: `npm run check` en verde**
    RF: RNF-4, criterio de finalización 8
    Hecho cuando: `npm run check` de raíz (tipos + tests de los tres workspaces) pasa sin errores y anoto el resultado en la respuesta final.
