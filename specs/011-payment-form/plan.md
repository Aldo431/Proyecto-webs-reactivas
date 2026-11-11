# Plan 011 — Formulario de pago (mock)

Plan de implementación para la spec `011-payment-form`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-10. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10.*

Organización dentro del frontend existente (`apps/frontend/client/src/`), separando estrictamente la lógica de la interfaz (§3). No hay cambios en el backend ni en el formato de `products.json`; la arquitectura se mantiene sin red para el pago (RNF-2).

- **Lógica pura testeable** — `src/logic/` *(RF-5, RF-6, RF-7, RNF-5, RNF-6)*
  - `paymentFields.ts` (nuevo): funciones puras del formulario de pago, sin React ni DOM:
    - `normalizeCardNumber(value: string): string` — elimina todo carácter no dígito (espacios, guiones). *(RF-5, RF-6)*
    - `formatCardNumber(value: string): string` — agrupa los dígitos de a 4 con espacios (`4111 1111 1111 1111`); trunca a la longitud máxima esperada. *(RF-5)*
    - `detectCardBrand(digits: string): CardBrand` con `CardBrand = "visa" | "mastercard" | "amex" | "unknown"` — `4` → visa; `34`/`37` → amex; `51`–`55` o primeros 4 dígitos entre `2221` y `2720` → mastercard. *(RF-5)*
    - `expectedCardLength(brand: CardBrand): 15 | 16` — 15 para amex, 16 para el resto. *(RF-5, RF-6)*
    - `isCompleteCardNumber(digits: string): boolean` — `true` si contiene solo dígitos y su longitud es la esperada para la marca detectada. *(RF-5)*
    - `isExpiryCurrentOrFuture(expiry: string, now?: Date): boolean` — parsea `MM/AA`; válido si `AAMM >= AAMM` actual (mes actual incluido). `now` inyectable para tests deterministas. *(RF-6)*
    - `paymentFormSchema`: esquema Zod con mensajes en español — `email: z.email("Correo electrónico inválido.")`, `cardNumber` (dígitos + longitud según marca vía `superRefine` usando `detectCardBrand`/`expectedCardLength`), `expiry` (`regex` `^(0[1-9]|1[0-2])\/\d{2}$` + `superRefine` con `isExpiryCurrentOrFuture`), `cvc: regex /^\d{3,4}$/`, `holderName: string trim min 1 ("Ingresa el nombre del titular.") max 100`. Sin Luhn. *(RF-6)*
  - `formErrors.ts` (existente): se reutiliza `issuesToFieldErrors(error: ZodError): Record<string, string>` para mapear issues a errores por campo. *(RF-6)*
  - `cartCalculations.ts` (existente): se reutilizan `calculateItemSubtotal`, `calculateCartTotal` y `formatPriceCLP` para el resumen y el monto del botón "Pagar". *(RF-3, RF-5)*

- **Estado y contexto** — `src/context/` *(RF-3, RF-7, RF-8)*
  - `CartContext.tsx` / `useCart()` (existente): fuente única de `items`, `totalAmount` y `clearCart()`. El pago vacía el carrito con el mismo `clearCart()` que usa "Vaciar carrito". *(RF-3, RF-7)*
  - `AuthContext.tsx` / `useAuth()` (existente): expone `user.email` para precargar el correo; `state.status` para el guard de ruta. *(RF-2, RF-5)*

- **Componentes de UI** — `src/components/` *(RF-1, RF-3, RF-5, RF-8, RF-10)*
  - `TextField.tsx` (extender): añadir prop opcional `trailing?: ReactNode`, renderizada dentro de un contenedor `relative` a la derecha del `Input` (p. ej. check verde del campo tarjeta). Retrocompatible: sin `trailing`, el render queda igual. *(RF-5, RF-10)*
  - `OrderSummary.tsx` (nuevo, solo presentación): lista de ítems (miniatura, nombre, cantidad, subtotal por línea `font-mono`) y total general con `formatPriceCLP`. Sin controles de edición. Props: `items: CartItem[]`, `totalAmount: number`. *(RF-3)*
  - `PaymentSuccess.tsx` (nuevo, solo presentación): mensaje "¡Compra realizada con éxito!", monto pagado en `font-mono` y botón "Volver a la tienda" → `/`. Props: `totalPaid: number`. *(RF-8)*
  - `CartDrawer.tsx` (modificar): "Finalizar compra" ya no ejecuta `clearCart` + `closeCart`; ahora navega a `/pago` con `useNavigate()`. El drawer se cierra solo al cambiar la URL (efecto existente sobre `location.pathname`). *(RF-1)*
  - `OnlyAuthenticatedRoute.tsx` (modificar): al redirigir a `/iniciar-sesion`, pasa `state={{ from: location.pathname }}` con `replace`, habilitando el retorno tras login. *(RF-2)*

- **Páginas** — `src/pages/` *(RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10)*
  - `LoginPage.tsx` (modificar): en login exitoso, navega a `location.state.from` si es una ruta interna segura (empieza con `/` y no con `//`); si no, mantiene `navigate("/")`. *(RF-2)*
  - `PaymentPage.tsx` (nuevo): página `#/pago`.
    - Resumen `<OrderSummary>` arriba, solo lectura. *(RF-3)*
    - Formulario vertical: correo (precargado con `user.email`, editable) → número de tarjeta (formato con espacios, marca detectada como texto indicativo, check verde `lucide-react` `Check` cuando `isCompleteCardNumber`) → fila vencimiento + CVC (dos columnas) → titular → botón `Pagar $<total>` abajo. *(RF-5)*
    - Validación Zod al enviar con `paymentFormSchema`; errores por campo con `TextField` (`aria-invalid`, `aria-describedby`, `role="alert"`), foco al primer campo inválido (`FIELD_ORDER = ["email", "cardNumber", "expiry", "cvc", "holderName"]`). *(RF-6, RF-10)*
    - Al confirmar: captura `totalAmount` como `paidTotal`, llama `clearCart()`, descarta los valores del formulario (estado local `null`) y muestra `<PaymentSuccess>` en la misma ruta. *(RF-7, RF-8, RF-9)*
    - Guardia de carrito vacío: si `items.length === 0 && paidTotal === null`, `<Navigate to="/catalogo" replace />`; tras el éxito la guardia no aplica. *(RF-4, RF-8)*
    - Datos de tarjeta solo en estado local de React: nunca en `localStorage`, red ni consola; se descartan al éxito o al desmontar. Inputs con `autoComplete="cc-email | cc-number | cc-exp | cc-csc | cc-name"`. *(RF-9)*

- **Montaje general** — `src/App.tsx` *(RF-1, RF-2)*
  - Nueva ruta `<Route path="/pago" element={<OnlyAuthenticatedRoute><PaymentPage /></OnlyAuthenticatedRoute>} />` junto a las demás rutas protegidas; `CartDrawer` sigue montado a nivel raíz. *(RF-1, RF-2)*

## 2. Modelo de datos
*Cubre: RF-5, RF-6, RF-7, RF-9.*

No hay datos nuevos ni persistencia: el pago es 100% en cliente y el pedido **no** se almacena en ninguna parte (RF-9, RNF-2). Única estructura nueva, en memoria (estado local de `PaymentPage`):

```json
{
  "email": "estudiante@dcc.uchile.cl",
  "cardNumber": "4111 1111 1111 1111",
  "expiry": "12/29",
  "cvc": "123",
  "holderName": "Estudiante DCC"
}
```

(Claves en inglés; el valor `cardNumber` se conserva con espacios para el input y se normaliza con `normalizeCardNumber` al validar. El total del botón y del éxito sale de `totalAmount` del carrito, única fuente de verdad. El carrito persiste como siempre en `localStorage` clave `cart` y se vacía al pagar.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Ruta dedicada `/pago` protegida con `OnlyAuthenticatedRoute` y retorno vía `location.state.from`.**
- Justificación: La spec exige URL propia, acceso solo autenticado y vuelta a `#/pago` tras login (RF-1, RF-2). Se reutiliza el patrón existente de rutas protegidas que ya redirige a `/iniciar-sesion` (`App.tsx`, `OnlyAuthenticatedRoute.tsx`); añadir `state={{ from }}` y que `LoginPage` lo consuma (validando que sea ruta interna, sin `//`) cierra el flujo sin componentes nuevos. *(RF-1, RF-2)*
- Alternativa descartada: **Modal/overlay de pago sobre el drawer**. No hay URL dedicada, complica foco y no cumple RF-2 con retorno explícito; fue descartado en la spec.

**D2 — Pago mock en cliente, sin endpoint ni simulación de red.**
- Justificación: La spec exige que al pagar no ocurra ninguna petición de red y que el éxito sea siempre inmediato (RF-7, RNF-2); el backend de pagos está fuera de alcance (spec, Fuera de alcance). Reutilizar `clearCart()` del contexto evita duplicar la lógica de vaciado (004 RF-9, §3). *(RF-7, RF-9)*
- Alternativa descartada: **Endpoint Express `/api/pagos` simulado con latencia**. Añadiría superficie de backend, latencia artificial y tests de servidor sin beneficio alguno para un mock declarado.

**D3 — Lógica del formulario en `src/logic/paymentFields.ts` con funciones puras, Zod e `issuesToFieldErrors`.**
- Justificación: §3 exige separar lógica de UI y §4 tests obligatorios para lógica de negocio; el formato/detección/validación son funciones puras perfectamente testeables sin renderizar React. Los mensajes de Zod van en español según RNF-1 y los errores se mapean por campo con la utilidad existente. *(RF-5, RF-6, RNF-5, RNF-6)*
- Alternativa descartada: **Validar dentro del componente con `useState` suelto y condicionales**. Acopla cálculo a presentación y duplica la lógica que §4 exige testear.

**D4 — Detección de marca por prefijo y formato en grupos de 4; sin Luhn; Amex 15 dígitos.**
- Justificación: La spec lo fija así (RF-5, RF-6, decisión [RESUELTO]): Visa `4`, Mastercard `51`–`55` y `2221`–`2720`, Amex `34`/`37` con 15 dígitos; el resto 16. Grupos de 4 uniformes en el input visible y normalización a dígitos al validar evitan ramas de formato por marca. *(RF-5, RF-6)*
- Alternativa descartada: **Validación Luhn y agrupación 4-6-5 para Amex**. Ambas contravienen decisiones explícitas de la spec (validación básica, formato grupos de 4).

**D5 — Extensión retrocompatible de `TextField` con prop `trailing?: ReactNode` para el check verde.**
- Justificación: El campo tarjeta necesita un indicador a la derecha (icono `Check` de `lucide-react`, verde) sin duplicar el patrón label + `aria-invalid` + `aria-describedby` + `role="alert"` ya probado (RF-5, RF-10). Un `trailing` opcional en `TextField` evita un componente de campo paralelo y mantiene una sola fuente de accesibilidad. *(RF-5, RF-10)*
- Alternativa descartada: **`CardNumberField` propio duplicando label/error**. Duplica ~40 líneas de lógica a11y y crea dos patrones de campo en el código.

**D6 — Pantalla de éxito en la misma ruta `#/pago` con estado local `paidTotal`; sin ruta `/exito` ni folio.**
- Justificación: La spec define el éxito en la misma ruta (RF-8, [ASUMIDO]) y prohíbe folio (sin backend de órdenes). Guardar `paidTotal` antes de `clearCart()` permite mostrar "¡Compra realizada con éxito!" con el monto exacto y desactivar la redirección de carrito vacío (RF-4) sin persistir nada (RF-9). *(RF-4, RF-7, RF-8, RF-9)*
- Alternativa descartada: **Ruta `/exito` con el total en `location.state`**. Añade una ruta pública que revela un monto sin contexto y un estado frágil ante recargas; la spec lo descarta.

**D7 — Total del botón "Pagar $<total>" y del resumen leídos del mismo `totalAmount` de `useCart()`.**
- Justificación: Una única fuente de verdad garantiza sincronía entre el listado de productos, el total del resumen y el texto del botón, incluso si el carrito cambiara antes de pagar (RF-3, RF-5). Formatear con `formatPriceCLP` reutiliza el formato chileno ya probado. *(RF-3, RF-5)*
- Alternativa descartada: **Copia local del total en estado del formulario**. Riesgo de desincronización y duplicación del cálculo (§3).

**D8 — Redirección de carrito vacío con `<Navigate to="/catalogo" replace />` y guarda `paidTotal === null`.**
- Justificación: Declarativa, sin efectos adicionales, y la guarda `paidTotal` implementa la exención del éxito exigida por la spec (RF-4, RF-8). Recarga con carrito vacío redirige igual. *(RF-4)*
- Alternativa descartada: **Página dedicada o estado dentro del formulario con mensaje**. Añade UI y ramas innecesarias para un caso que la spec resuelve redirigiendo a `#/catalogo`.

**D9 — Sin dependencias nuevas y sin cambios en el backend ni en `products.json`.**
- Justificación: Toda la funcionalidad se construye con React 19, Tailwind v4, Zod, `lucide-react` y primitivas `ui/` existentes (RNF-7, §1). No hay llamadas de red ni persistencia de órdenes (RNF-2, §5). *(transversal)*
- Alternativa descartada: **Librería de inputs de tarjeta (react-credit-cards, etc.)**. Viola §1/RNF-7 y gran parte de su API sería inutilizable sin pasarela real.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 12.*

- **Lógica pura obligatoria (§4)** — `src/logic/paymentFields.test.ts`:
  - `normalizeCardNumber("4111 1111-1111 1111")` retorna `"4111111111111111"`. *(Verifica RF-5)*
  - `formatCardNumber("4111111111111111")` retorna `"4111 1111 1111 1111"`; con 10 dígitos retorna `"4111 1111 11"`. *(Verifica RF-5)*
  - `detectCardBrand("4111111111111111")` → `"visa"`; `"5500000000000004"` → `"mastercard"`; `"2221000000000009"` → `"mastercard"`; `"2720999999999996"` → `"mastercard"`; `"2721000000000005"` → `"unknown"`; `"378282246310005"` → `"amex"`; `"6011111111111117"` → `"unknown"`. *(Verifica RF-5)*
  - `expectedCardLength("amex")` → `15`; `expectedCardLength("visa")` → `16`. *(Verifica RF-5)*
  - `isCompleteCardNumber("4111111111111111")` → `true`; `("411111111111")` → `false`; `("411111111111111a")` → `false`; amex de 15 → `true`. *(Verifica RF-5)*
  - `isExpiryCurrentOrFuture("12/29", new Date(2026, 10, 8))` → `true`; `("11/26", now=2026-11)` → `true` (mes actual); `("10/26", now=2026-11)` → `false`; `("13/30"` no llega aquí: el regex lo rechaza. *(Verifica RF-6)*
  - `paymentFormSchema.safeParse` con datos válidos retorna `success: true` y `cardNumber` normalizable. *(Verifica RF-6)*
  - `paymentFormSchema` rechaza: correo `"no-es-correo"`; titular `""` o `"   "` con menaje "Ingresa el nombre del titular."; tarjeta de 15 dígitos Visa; tarjeta de 16 dígitos Amex; vencimiento `"00/29"`, `"13/29"`, `"1/29"`, mes anterior; CVC `"12"` y `"12345"`. *(Verifica RF-6)*
  - `paymentFormSchema` acepta CVC de 3 y 4 dígitos; vencimiento `MM/AA` válido; correo de sesión típico. *(Verifica RF-6)*
  - Integración con `issuesToFieldErrors`: tarjeta incompleta mapea error a la clave `cardNumber`. *(Verifica RF-6)*

- **Presentación (smoke tests opcionales, §4):**
  - `PaymentPage.test.tsx`: con providers (`AuthProvider`, `CartProvider`, `MemoryRouter`) y carrito vacío en `localStorage`, la ruta `/pago` redirige a `/catalogo`.
  - Render con ítems en `localStorage`: muestra el resumen, el total en `font-mono` y el botón "Pagar $<total>".
  - Tras enviar el formulario válido: aparece "¡Compra realizada con éxito!" y `localStorage` clave `cart` queda vacía.
  - `LoginPage.test.tsx` (extensión): login con `state.from = "/pago"` navega a `/pago`; sin state, mantiene `/`.

- **Verificación de contrato por QA (manual):**
  - Drawer → "Finalizar compra" navega a `#/pago` sin vaciar el carrito; el drawer se cierra.
  - Anónimo en `#/pago` → redirige a `/iniciar-sesion`; tras entrar, vuelve a `#/pago` (no a `/`).
  - Correo precargado y editable; tarjeta con espacios y marca detectada; check verde al completar 16 dígitos (y 15 en Amex).
  - Vencimiento en fila con CVC en 360 px; sin scroll horizontal; foco visible; errores anunciados.
  - "Pagar $<total>" siempre exitoso; carrito vaciado; éxito con monto y "Volver a la tienda" → `/`.
  - Recarga con carrito vacío → `#/catalogo`; con éxito visible no redirige.

- **Ausencia de red:** Sin mocks de API; los tests de lógica son síncronos. El login se mockea como ya hacen `LoginPage.test.tsx` / `AuthContext.test.tsx`.
- **Comando de cierre:** `npm run check` (tipos + tests + build) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `CartDrawer.tsx`: "Finalizar compra" navega a `/pago` | RF-1 |
| Ruta `/pago` en `App.tsx` + `OnlyAuthenticatedRoute` con `state.from` + retorno en `LoginPage` | RF-2 |
| `OrderSummary.tsx` (solo lectura) + total `font-mono` con `formatPriceCLP` | RF-3 |
| Guardia `<Navigate to="/catalogo" replace />` con excepción `paidTotal` | RF-4 |
| `PaymentPage` formulario vertical: correo precargado, tarjeta con espacios, marca, check verde, fila vencimiento+CVC, botón "Pagar $<total>" | RF-5 |
| `paymentFields.ts` `paymentFormSchema` + errores en español + `TextField` (`aria-invalid`/`aria-describedby`) | RF-6 |
| `handleSubmit`: sin red, `clearCart()`, `setPaidTotal`, descarte del formulario | RF-7, RF-9 |
| `PaymentSuccess.tsx`: "¡Compra realizada con éxito!" + monto + "Volver a la tienda" | RF-8 |
| `TextField` extendido con `trailing`; campos con `autoComplete` cc-*, foco visible, orden de tabulación | RF-9, RF-10 |
| Pruebas unitarias de `paymentFields.ts` en Vitest | Verificación RF-5, RF-6, RF-7 (§4) |

---
*Nota:* La spec no deja dudas abiertas; el plan asume los [ASUMIDO] de la spec (redirección a `#/catalogo`, éxito en la misma ruta, Amex 15 dígitos, grupos de 4, mes actual vigente) y los valores más conservadores. La `specs/004-shopping-cart/spec.md` (RF-9) quedó documentada en la spec 011 como reemplazada por esta funcionalidad; su edición queda para la implementación y solo con confirmación explícita del usuario. El siguiente paso es generar `specs/011-payment-form/tasks.md` a partir de esta spec y este plan.
