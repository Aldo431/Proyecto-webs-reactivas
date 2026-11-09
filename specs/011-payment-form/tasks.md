# Tasks 011 — Formulario de pago (mock)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 011 del flujo de pago y autenticación**
    RF: RF-1…RF-10 (base para todo)
    Hecho cuando: conozco `CartDrawer.tsx` ("Finalizar compra" hoy hace `clearCart` + `closeCart`), `OnlyAuthenticatedRoute.tsx` (redirige a `/iniciar-sesion` sin retorno), `LoginPage.tsx` (navega a `/` tras login), `TextField.tsx` (sin slot `trailing`), `cartCalculations.ts` (`formatPriceCLP`, `calculateItemSubtotal`, `calculateCartTotal`), `formErrors.ts` (`issuesToFieldErrors`), `CartContext`/`AuthContext` y el sistema de diseño (`specs/00-design-system`).

## Fase 1 — Lógica pura del formulario (depende de 1)

- [x] **2. Implementar `src/logic/paymentFields.ts`**
    RF: RF-5, RF-6 (más RNF-5)
    Hecho cuando: implemento `normalizeCardNumber`, `formatCardNumber` (grupos de 4), `detectCardBrand` (Visa `4`, Mastercard `51`–`55` y `2221`–`2720`, Amex `34`/`37`, otro `unknown`), `expectedCardLength` (15 amex / 16 resto), `isCompleteCardNumber`, `isExpiryCurrentOrFuture(expiry, now?)` con `now` inyectable, y `paymentFormSchema` (Zod con mensajes en español: email válido, tarjeta solo dígitos con longitud según marca, vencimiento `MM/AA` vigente, CVC 3–4 dígitos, titular trim con min 1 "Ingresa el nombre del titular." y max 100, sin Luhn).

- [x] **3. Tests unitarios de `paymentFields.ts`**
    RF: RF-5, RF-6 (más RNF-6)
    Hecho cuando: `paymentFields.test.ts` cubre normalización (espacios/guiones), formato en grupos de 4, detección de marca en bordes (`2221`/`2720` válidos, `2721` no; Amex 15 vs 16), longitud completa, vencimiento (mes actual válido, mes anterior inválido, inyectando `now`), aceptación de CVC 3 y 4, rechazo de correo inválido/titular vacío/tarjeta de largo equivocado/mes fuera de rango, e integración con `issuesToFieldErrors` (tarjeta incompleta → clave `cardNumber`), y pasan.

## Fase 2 — Infraestructura de UI (depende de 2)

- [x] **4. Extender `TextField.tsx` con `trailing?: ReactNode`**
    RF: RF-5, RF-10 (más RNF-3)
    Hecho cuando: `TextField` acepta `trailing` opcional y lo renderiza a la derecha dentro del campo (contenedor `relative`) sin cambiar el render cuando no se pasa, manteniendo label asociado, `aria-invalid`, `aria-describedby` y `role="alert"` intactos, y `npm run check` sigue en verde.

- [x] **5. Crear `OrderSummary.tsx` (resumen solo lectura)**
    RF: RF-3 (más RNF-3)
    Hecho cuando: renderizo lista de ítems (miniatura, nombre, cantidad, subtotal por línea en `font-mono` con `formatPriceCLP`) y total general en `font-mono`, con props tipadas `items`/`totalAmount`, sin controles de cantidad/eliminar/vaciar, en superficie `card` del sistema de diseño y sin desplazamiento horizontal en 360 px.

- [x] **6. Crear `PaymentSuccess.tsx` (pantalla de éxito)**
    RF: RF-8 (más RNF-3, RNF-10)
    Hecho cuando: renderizo "¡Compra realizada con éxito!", el monto pagado en `font-mono` con `formatPriceCLP` y un botón "Volver a la tienda" (`Button`) que navega a `/`, en español y con superficie `card`.

## Fase 3 — Ruta protegida y retorno tras login (depende de 1)

- [x] **7. Pasar `state={{ from }}` en `OnlyAuthenticatedRoute` y retorno en `LoginPage`**
    RF: RF-2
    Hecho cuando: al redirigir a `/iniciar-sesion`, `OnlyAuthenticatedRoute` pasa `state={{ from: location.pathname }}` con `replace`; `LoginPage`, tras login exitoso, navega a `location.state.from` solo si es una ruta interna segura (empieza con `/` y no con `//`) y a `/` en cualquier otro caso; sin sesión en `#/pago` se llega a login y, tras entrar, se vuelve a `#/pago` (verifico con un test de `LoginPage` extendido o QA manual).

## Fase 4 — Página de pago (depende de 2, 3, 4, 5, 6, 7)

- [x] **8. Crear `PaymentPage.tsx`: resumen + formulario vertical**
    RF: RF-3, RF-4, RF-5, RF-6, RF-9, RF-10
    Hecho cuando: renderizo `<OrderSummary>` arriba (solo lectura); formulario en vertical correo (precargado con `user.email`, `autoComplete="cc-email"`) → número de tarjeta (formato con espacios, marca detectada indicada, `inputMode="numeric"`, check verde `lucide-react` `Check` cuando `isCompleteCardNumber`, `autoComplete="cc-number"`) → fila vencimiento + CVC en la misma fila (dos columnas, también en 360 px, `autoComplete="cc-exp"`/`cc-csc`) → titular (`autoComplete="cc-name"`) → botón "Pagar $<total>" abajo con el total del resumen en formato chileno, y con `paidTotal === null && items.length === 0` redirijo con `<Navigate to="/catalogo" replace />`.

- [x] **9. Validación al enviar, pago mock, éxito y descarte de datos**
    RF: RF-6, RF-7, RF-8, RF-9 (más RNF-2)
    Hecho cuando: al enviar valido con `paymentFormSchema`, mapeo errores con `issuesToFieldErrors` y muestro mensajes por campo (`aria-invalid`/`aria-describedby`/`role="alert"`) con foco al primer campo inválido (`FIELD_ORDER`: email, cardNumber, expiry, cvc, holderName); si todo es válido, capturo `totalAmount` como `paidTotal`, llamo `clearCart()`, descarto los valores del formulario y muestro `<PaymentSuccess>` en la misma ruta; ningún dato de tarjeta queda en `localStorage`/`sessionStorage`/cookies ni en consola, y no hay llamadas de red.

## Fase 5 — Integración y cierre (depende de 8, 9)

- [x] **10. Navegación desde el drawer y montaje de la ruta `/pago`**
    RF: RF-1, RF-2
    Hecho cuando: en `CartDrawer.tsx`, "Finalizar compra" navega a `/pago` con `useNavigate()` sin vaciar el carrito (el drawer se cierra solo al cambiar la URL); en `App.tsx` añado `<Route path="/pago" element={<OnlyAuthenticatedRoute><PaymentPage /></OnlyAuthenticatedRoute>} />` junto a las demás rutas protegidas.

- [x] **11. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-10, RNF-1…RNF-8
    Hecho cuando: verifico en navegador: "Finalizar compra" navega sin vaciar; anónimo → login → retorno a `#/pago`; correo precargado editable; tarjeta con espacios y marca detectada; check verde al completar 16 dígitos (y 15 en Amex); vencimiento y CVC en una fila en 360 px sin scroll horizontal; "Pagar $<total>" exitoso con carrito vaciado y éxito con monto ("Volver a la tienda" → `/`); recarga con carrito vacío → `#/catalogo`; con éxito visible no redirige; teclado completo, foco visible, errores anunciados y `reduced-motion` sin animaciones no esenciales; consola limpia.

- [x] **12. Smoke tests de `PaymentPage` (opcional, recomendado)**
    RF: RF-3, RF-4, RF-7, RF-8 (más RNF-6)
    Hecho cuando: con `AuthProvider` + `CartProvider` + `MemoryRouter`, el test verifica redirección a `/catalogo` con carrito vacío, render del resumen con ítems en `localStorage` y botón "Pagar $<total>", y éxito + carrito vacío tras enviar el formulario válido.

- [x] **13. Cierre: `npm run check` en verde**
    RF: RNF-6, criterio de finalización 12
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.

---
*Nota:* todas las tareas quedan pendientes (`- [ ]`) salvo el inventario de la Fase 0, ya realizado. La `specs/004-shopping-cart/spec.md` (RF-9) queda documentada en la spec 011 como reemplazada; su edición se hará en la implementación y solo con confirmación explícita del usuario. El siguiente paso es la implementación tarea a tarea, ejecutando `npm run check` al final conforme AGENTS.md.
