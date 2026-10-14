# Plan 004 — Carrito de compras (Panel lateral)

Plan de implementación para la spec `004-shopping-cart`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-9. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9.*

Organización dentro del frontend existente (`apps/frontend/client/src/`), separando estrictamente la lógica de la interfaz (§3). No hay cambios en el backend, manteniéndose la arquitectura sin red (RNF-2).

- **Lógica pura testeable** — `src/logic/` *(RF-1, RF-3, RF-4, RF-5, RF-7, RF-8, RF-9)*
  - `cartTypes.ts`: Esquemas Zod y tipos TypeScript derivados para `CartItem` (`productId`, `name`, `price`, `image`, `quantity`) y `CartItemSchema`. Valida tipos estrictos y asegura que `price` y `quantity` sean enteros positivos. *(RF-7, RF-8)*
  - `cartCalculations.ts`: Funciones matemáticas y de formateo puras:
    - `calculateItemSubtotal(price: number, quantity: number): number` *(RF-5)*
    - `calculateCartTotal(items: CartItem[]): number` *(RF-5)*
    - `calculateTotalQuantity(items: CartItem[]): number` *(RF-1)*
    - `getCartBadgeText(totalCount: number): string | null` (retorna `null` en 0, el número en 1–99 y `"99+"` sobre 99). *(RF-1)*
    - `formatPriceCLP(amount: number): string` (formateo en moneda chilena usando `Intl.NumberFormat('es-CL')`). *(RF-5)*
  - `cartOperations.ts`: Funciones inmutables para manipulación de la lista de ítems, sin tope máximo:
    - `addItemToCart(items: CartItem[], product: { id: string; name: string; price: number; image: string }): CartItem[]` (incrementa si ya existe o agrega con cantidad 1, sin tope). *(RF-3)*
    - `updateItemQuantity(items: CartItem[], productId: string, quantity: number): CartItem[]` (si `quantity <= 0`, elimina el producto). *(RF-4)*
    - `removeItemFromCart(items: CartItem[], productId: string): CartItem[]` *(RF-4)*
    - `clearCart(): CartItem[]` (vacía todo, usado por "Vaciar carrito"). *(RF-4, RF-9)*
  - `cartStorage.ts`: Persistencia segura en `localStorage` con clave `cart`:
    - `loadCartFromStorage(products: Product[]): CartItem[]` (deserializa con clave `cart`, valida con `CartItemSchema.array()`; descarta ítems con `productId` inexistente en el catálogo; actualiza `name`/`price`/`image` a los valores del catálogo manteniendo `quantity`; ante JSON corrupto o esquema incompatible retorna `[]` sin lanzar). *(RF-7)*
    - `saveCartToStorage(items: CartItem[]): void` (serializa en clave `cart`; si `localStorage` está deshabilitado o excede cuota, opera en memoria sin crashear). *(RF-7)*
    - Sin sincronización entre pestañas en esta fase. *(RF-7)*
  - `productParse.ts`: Actualización del esquema `ProductSchema` con `price: z.number().int().positive()` y tipado correspondiente. *(RF-8)*

- **Estado y Contexto** — `src/context/` *(RF-1, RF-2, RF-3, RF-4, RF-7, RF-9)*
  - `CartContext.tsx` y `useCart()`: Proveedor de contexto React 19 para exponer el estado global del carrito (`items`, `isOpen`, `totalCount`, `totalAmount`, `openCart`, `closeCart`, `toggleCart`, `addItem`, `updateQuantity`, `removeItem`, `clearCart`).
  - Sincroniza automáticamente los cambios de `items` con `cartStorage` mediante un efecto reactivo. `addItem` abre el drawer como confirmación (RF-3).

- **Componentes de UI** — `src/components/` *(RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-9)*
  - `Header.tsx`: Reemplaza el marcador "Próximamente" del carrito por un botón interactivo usando la primitiva `Button`. Muestra el icono `ShoppingCart`, el texto "Carrito", el badge (`Badge` de `ui/badge.tsx`) con `getCartBadgeText(totalCount)` solo cuando `totalCount > 0`, `aria-expanded` según el drawer y activa `openCart()`. *(RF-1)*
  - `CartDrawer.tsx`: Contenedor del panel lateral (drawer) anclado a la derecha:
    - Backdrop semitransparente con desenfoque (`bg-background/80 backdrop-blur-sm`).
    - Panel accesible (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="cart-title"`, foco atrapado, retorno de foco al activador y cierre con `Escape`).
    - Bloqueo de scroll en el `body` mientras el drawer permanezca abierto, con scroll interno de la lista.
    - Responsive sin scroll horizontal: `calc(100vw - 32px)` en 360 px, máximo 420 px en escritorio; animación de deslizamiento `base` 250 ms con curva estándar, desactivada con `prefers-reduced-motion`.
    - Se cierra automáticamente al navegar (p. ej. "Explorar catálogo").
    - Cabecera con título "Tu Carrito" y botón cerrar (visual "✕", `aria-label="Cerrar carrito"`).
    - Cuerpo con lista deslizable de `CartItemRow` o `CartEmptyState`.
    - Pie con desglose de subtotal/total, botón "Vaciar carrito" (limpia directo) y botón "Finalizar compra" (vacía y cierra). *(RF-2, RF-5, RF-6, RF-9)*
  - `CartItemRow.tsx`: Fila individual: miniatura, nombre, precio unitario en `font-mono`, botones `-` y `+` con `aria-label` en español, botón eliminar (icono `Trash2`) y subtotal de línea. *(RF-4, RF-5)*
  - `CartEmptyState.tsx`: Mensaje "Tu carrito está vacío." con botón "Explorar catálogo" que cierra el drawer y navega a `#/catalogo`. *(RF-6)*
  - `ProductCard.tsx`: Mantiene el `Link` al detalle y añade el botón "Agregar" fuera del `Link` (contenedor no interactivo) con `aria-label="Agregar <nombre> al carrito"`, que agrega sin navegar. Muestra el precio formateado en `font-mono`. *(RF-3, RF-8)*

- **Páginas** — `src/pages/` *(RF-3, RF-8)*
  - `ProductDetailPage.tsx`: Muestra el precio formateado con `formatPriceCLP(product.price)` y botón primario "Agregar al carrito" que invoca `addItem(product)` y `openCart()`; oculto en "Producto no encontrado". *(RF-3, RF-8)*
  - `CatalogPage.tsx` / inicio (vía `ProductCard` / `ProductGrid` / destacados): muestran precio formateado y agregado rápido sin cambios de ruta. *(RF-3, RF-8)*

- **Montaje general** — `src/App.tsx` *(RF-1, RF-2)*
  - Envuelve la jerarquía de rutas en `<CartProvider>` e incluye `<CartDrawer />` a nivel raíz.

## 2. Modelo de datos JSON
*Cubre: RF-7, RF-8.*

Actualización de `apps/frontend/client/src/data/products.json` incorporando precios en pesos chilenos (enteros positivos sin decimales):

```json
{
  "products": [
    {
      "id": "taza-dcc",
      "name": "Taza DCC",
      "category": "Tazas",
      "price": 6000,
      "image": "/images/taza-dcc.png",
      "description": "Taza de cerámica con el logo del DCC.",
      "featured": true
    },
    {
      "id": "polera-dcc",
      "name": "Polera DCC",
      "category": "Poleras",
      "price": 12000,
      "image": "/images/polera-dcc.png",
      "description": "Polera de algodón con estampado del DCC.",
      "featured": true
    },
    {
      "id": "sticker-dcc",
      "name": "Sticker DCC",
      "category": "Stickers",
      "price": 1500,
      "image": "/images/sticker-dcc.png",
      "description": "Stickers con el logo del DCC.",
      "featured": true
    }
  ]
}
```

Estructura persistida en `localStorage` (clave `cart`):

```json
[
  {
    "productId": "taza-dcc",
    "name": "Taza DCC",
    "price": 6000,
    "image": "/images/taza-dcc.png",
    "quantity": 2
  }
]
```

(Claves en inglés; textos de usuario en español en la UI, no en el JSON. Imágenes locales, sin red. La clave es `cart` según la spec; al cargar se revalida contra el catálogo: se descartan ids inexistentes y se actualizan nombre/precio/imagen.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Estado global mediante React Context nativo (`CartContext`), en vez de librerías de terceros.**
- Justificación: El estado debe consumirse en `Header`, `ProductDetailPage`, `ProductCard` y `CartDrawer`. React 19 provee Context nativo suficiente sin paquetes pesados (§1, RNF-8). *(RF-1, RF-2, RF-3)*
- Alternativa descartada: **Zustand o Redux Toolkit**. Añadiría dependencias fuera del stack sin justificación (§1).

**D2 — Operaciones y cálculos aritméticos en funciones puras independientes de React.**
- Justificación: La constitución (§3, §4) exige separar lógica de UI y tests obligatorios. Mutaciones (`addItemToCart`, `updateItemQuantity`, `removeItemFromCart`, `clearCart`), cálculos y `getCartBadgeText` en `src/logic/` se testean con Vitest sin renderizar React. *(RF-1, RF-3, RF-4, RF-5, RF-9, RNF-6, RNF-7)*
- Alternativa descartada: **Lógica en callbacks y `setState` dentro de componentes**. Acopla cálculo a UI y dificulta tests.

**D3 — Persistencia en `localStorage` clave `cart` con validación Zod y revalidación contra catálogo.**
- Justificación: `localStorage` es entrada externa (AGENTS.md exige Zod). Se valida con `CartItemSchema`, se descartan corruptos e ids inexistentes, y se actualizan nombre/precio/imagen desde el catálogo para evitar totales obsoletos. Fallback en memoria si está deshabilitado o excede cuota; sin sync entre pestañas en esta fase. *(RF-7)*
- Alternativa descartada: **Parseo directo con `JSON.parse` sin esquema ni revalidación**. Riesgo de crasheo y de precios obsoletos si el catálogo cambia.

**D4 — Panel lateral accesible con Tailwind v4 y primitivas locales, mock de finalizar.**
- Justificación: Tokens y primitivas `Button`/`Badge` aseguran el sistema "IDE institucional" (Spec 00) sin librerías pesadas. Foco atrapado/retornado, `Escape`, body lock y cierre al navegar cumplen accesibilidad. "Vaciar" limpia directo y "Finalizar compra" vacía y cierra, pues el pago real está fuera de alcance. *(RF-2, RF-6, RF-9, RNF-3, RNF-4, RNF-5)*
- Alternativa descartada: **Instalar Radix UI Dialog o Vaul**. Viola §1 al añadir dependencias innecesarias.

**D5 — Precios como enteros CLP.**
- Justificación: El peso chileno no tiene centavos. Enteros (`6000`, `12000`) con `z.number().int().positive()` eliminan errores de flotante (`0.1 + 0.2 !== 0.3`) y se formatean con `Intl.NumberFormat('es-CL')`. *(RF-5, RF-8)*
- Alternativa descartada: **Strings formateados en el JSON (ej. `"$6.000"`)**. Obligaría a parsear en cada operación.

**D6 — Botón rápido en tarjetas fuera del `Link`.**
- Justificación: `ProductCard` es un `Link` completo (002 RF-1); anidar un `<button>` dentro de `<a>` es HTML inválido e inaccesible. El botón "Agregar" va como hermano fuera del `Link`, agrega sin navegar y lleva `aria-label` en español. *(RF-3, RNF-4)*
- Alternativa descartada: **Botón anidado dentro del `Link` con `stopPropagation`**. Sigue inválido y rompe teclado/lectores.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 11.*

- **Lógica pura obligatoria (§4):**
  - `cartCalculations.test.ts`:
    - `calculateItemSubtotal(6000, 2)` retorna `12000`. *(Verifica RF-5)*
    - `calculateCartTotal` suma subtotales de múltiples ítems. *(Verifica RF-5)*
    - `calculateTotalQuantity` suma unidades. *(Verifica RF-1)*
    - `getCartBadgeText(0)` retorna `null`; `getCartBadgeText(5)` retorna `"5"`; `getCartBadgeText(120)` retorna `"99+"`. *(Verifica RF-1)*
    - `formatPriceCLP(6000)` produce `"$6.000"`. *(Verifica RF-5)*
  - `cartOperations.test.ts`:
    - `addItemToCart` en vacío crea ítem con cantidad 1. *(Verifica RF-3)*
    - `addItemToCart` con existente incrementa en 1 sin duplicar y sin tope. *(Verifica RF-3)*
    - `updateItemQuantity` incrementa/decrementa correctamente. *(Verifica RF-4)*
    - `updateItemQuantity` con 0 o negativa remueve el ítem. *(Verifica RF-4)*
    - `removeItemFromCart` elimina por `productId`. *(Verifica RF-4)*
    - `clearCart` retorna `[]`. *(Verifica RF-4, RF-9)*
  - `cartStorage.test.ts`:
    - `loadCartFromStorage` con datos válidos retorna los ítems. *(Verifica RF-7)*
    - `loadCartFromStorage` con JSON corrupto o esquema incompatible retorna `[]` sin lanzar. *(Verifica RF-7)*
    - `loadCartFromStorage` descarta ítems cuyo `productId` no existe en el catálogo. *(Verifica RF-7)*
    - `loadCartFromStorage` actualiza `price`/`name`/`image` al valor del catálogo manteniendo `quantity`. *(Verifica RF-7)*
    - `saveCartToStorage` escribe en clave `cart`. *(Verifica RF-7)*
  - `productParse.test.ts`:
    - Rechaza productos sin `price` o con negativos/decimales. *(Verifica RF-8)*

- **Presentación (smoke tests opcionales, §4):**
  - `Header.test.tsx`: badge oculto en 0 y con texto correcto (`5`, `99+`) cuando corresponde.
  - `ProductDetailPage.test.tsx`: precio formateado y botón "Agregar al carrito"; oculto en no-encontrado.
  - `ProductCard.test.tsx`: precio visible y botón "Agregar" fuera del `Link` que no navega al agregar.

- **Verificación de contrato por QA (manual):**
  - Detalle → "Agregar al carrito" abre el drawer con el producto.
  - Tarjeta → "Agregar" suma sin navegar al detalle.
  - `+`/`-`/papelera/vaciar actualizan subtotal/total al instante; `-` en 1 elimina.
  - "Finalizar compra" vacía el carrito y cierra sin llamar red.
  - "Explorar catálogo" cierra y navega a `#/catalogo`.
  - Recarga (F5) persiste el carrito válido desde clave `cart`.
  - `Escape`/backdrop/✕ cierran y retornan foco al botón del encabezado.
  - 360 px sin scroll horizontal; con `reduced-motion` sin deslizamiento.

- **Ausencia de red:** Sin APIs ni backend; tests síncronos en Vitest.
- **Comando de cierre:** `npm run check` (`tsc --noEmit` + Vitest) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| Botón en `Header.tsx` con badge (`getCartBadgeText`) y `aria-expanded` | RF-1 |
| `CartDrawer.tsx` accesible, responsive, con cierre y retorno de foco | RF-2 |
| "Agregar al carrito" en detalle y "Agregar" fuera del `Link` en `ProductCard` | RF-3 |
| `cartOperations.ts` + controles en `CartItemRow.tsx` | RF-4 |
| `cartCalculations.ts` + desglose en el drawer | RF-5 |
| `CartEmptyState.tsx` con enlace a catálogo | RF-6 |
| `cartStorage.ts` clave `cart` con Zod y revalidación | RF-7 |
| `products.json` + `ProductSchema` con `price`, precio en detalle y tarjetas | RF-8 |
| "Vaciar carrito" (`clearCart`) y "Finalizar compra" (vacía y cierra) | RF-9 |
| Pruebas unitarias de lógica pura en Vitest | Verificación RF-1 a RF-9 (§4) |

---
*Nota:* La spec no deja dudas abiertas; el plan asume clave `cart`, sin tope, badge `99+` y finalizar mock. El siguiente paso según el flujo es regenerar `specs/004-shopping-cart/tasks.md`, que quedó desactualizado (clave vieja, sin RF-9 ni agregado en tarjetas).
