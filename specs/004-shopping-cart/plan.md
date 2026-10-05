# Plan 004 — Carrito de compras (Panel lateral)

Plan de implementación para la spec `004-shopping-cart`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-8. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8.*

Organización dentro del frontend existente (`apps/frontend/client/src/`), separando estrictamente la lógica de la interfaz (§3). No hay cambios en el backend, manteniéndose la arquitectura sin red (RNF-2).

- **Lógica pura testeable** — `src/logic/` *(RF-1, RF-3, RF-4, RF-5, RF-7, RF-8)*
  - `cartTypes.ts`: Esquemas Zod y tipos TypeScript derivados para `CartItem` (`productId`, `name`, `price`, `image`, `quantity`) y `CartItemSchema`. Valida tipos estrictos y asegura que `price` y `quantity` sean enteros positivos. *(RF-7, RF-8)*
  - `cartCalculations.ts`: Funciones matemáticas y de formateo puras:
    - `calculateItemSubtotal(price: number, quantity: number): number` *(RF-5)*
    - `calculateCartTotal(items: CartItem[]): number` *(RF-5)*
    - `calculateTotalQuantity(items: CartItem[]): number` *(RF-1)*
    - `formatPriceCLP(amount: number): string` (formateo en moneda chilena usando `Intl.NumberFormat('es-CL')`). *(RF-5)*
  - `cartOperations.ts`: Funciones inmutables para manipulación de la lista de ítems:
    - `addItemToCart(items: CartItem[], product: { id: string; name: string; price: number; image: string }): CartItem[]` (incrementa si ya existe o agrega con cantidad 1). *(RF-3)*
    - `updateItemQuantity(items: CartItem[], productId: string, quantity: number): CartItem[]` (si `quantity <= 0`, elimina el producto). *(RF-4)*
    - `removeItemFromCart(items: CartItem[], productId: string): CartItem[]` *(RF-4)*
    - `clearCart(): CartItem[]` *(RF-4)*
  - `cartStorage.ts`: Persistencia segura en `localStorage`:
    - `loadCartFromStorage(): CartItem[]` (deserializa y valida con `CartItemSchema.array()`; ante cualquier error, retorna arreglo vacío defensivamente). *(RF-7)*
    - `saveCartToStorage(items: CartItem[]): void` (serializa de forma segura). *(RF-7)*
  - `productParse.ts`: Actualización del esquema `ProductSchema` con `price: z.number().int().positive()` y tipado correspondiente. *(RF-8)*

- **Estado y Contexto** — `src/context/` *(RF-1, RF-2, RF-3, RF-4, RF-7)*
  - `CartContext.tsx` y `useCart()`: Proveedor de contexto React 19 para exponer el estado global del carrito (`items`, `isOpen`, `totalCount`, `totalAmount`, `openCart`, `closeCart`, `toggleCart`, `addItem`, `updateQuantity`, `removeItem`, `clearCart`).
  - Sincroniza automáticamente los cambios de `items` con `cartStorage` mediante un efecto reactivo.

- **Componentes de UI** — `src/components/` *(RF-1, RF-2, RF-4, RF-5, RF-6)*
  - `Header.tsx`: Reemplaza el marcador "Próximamente" del carrito por un botón interactivo usando la primitiva `Button`. Muestra el icono `ShoppingCart`, el texto "Carrito", el badge numérico de unidades cuando `totalCount > 0` (`Badge` de `ui/badge.tsx`), y activa `openCart()`. *(RF-1)*
  - `CartDrawer.tsx`: Contenedor del panel lateral (drawer) anclado a la derecha:
    - Backdrop semitransparente con desenfoque (`bg-background/80 backdrop-blur-sm`).
    - Panel accesible (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="cart-title"`, foco atrapado y cierre mediante tecla `Escape`).
    - Bloqueo de scroll en el `body` mientras el drawer permanezca abierto.
    - Cabecera con título "Tu Carrito" y botón de cerrar ("✕").
    - Cuerpo con lista deslizable de `CartItemRow` o componente `CartEmptyState`.
    - Pie con desglose de subtotal, total acumulado, botón "Vaciar carrito" y botón institucional "Finalizar compra". *(RF-2, RF-5, RF-6)*
  - `CartItemRow.tsx`: Fila de producto individual: miniatura, nombre, precio unitario, botones `-` y `+` para modificar cantidad, botón de eliminar (icono `Trash2` de `lucide-react`) y subtotal de línea. *(RF-4, RF-5)*
  - `CartEmptyState.tsx`: Ilustración/icono y mensaje "Tu carrito está vacío." con botón "Explorar catálogo" que cierra el drawer y navega a `/catalogo`. *(RF-6)*

- **Páginas** — `src/pages/` *(RF-3, RF-8)*
  - `ProductDetailPage.tsx`: Muestra el precio formateado con `formatPriceCLP(product.price)` y añade el botón primario "Agregar al carrito" que invoca `addItem(product)` y `openCart()`. *(RF-3, RF-8)*

- **Montaje general** — `src/App.tsx` *(RF-1, RF-2)*
  - Envuelve la jerarquía de rutas en `<CartProvider>` e incluye `<CartDrawer />` a nivel raíz.

## 2. Modelo de datos JSON
*Cubre: RF-8.*

Actualización de [products.json](file:///c:/Users/HP/Documents/Apps%20webs%20reactiva/Proyecto-webs-reactivas/apps/frontend/client/src/data/products.json) incorporando precios en pesos chilenos (enteros positivos sin decimales):

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

Estructura persistida en `localStorage` (clave `tiendadcc_cart_v1`):

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

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Estado global mediante React Context nativo (`CartContext`), en vez de librerías de terceros.**
- Justificación: El estado del carrito debe ser consumido en el `Header` de todas las vistas, en `ProductDetailPage` y en el propio `CartDrawer`. React 19 provee Context nativo de alto rendimiento que cumple la necesidad sin agregar paquetes pesados al `package.json` (§1, RNF-7). *(RF-1, RF-2, RF-3)*
- Alternativa descartada: **Zustand o Redux Toolkit**. Añadiría dependencias innecesarias fuera del stack establecido sin justificación técnica (§1).

**D2 — Operaciones y cálculos aritméticos en funciones puras independientes de React.**
- Justificación: La constitución (§3, §4) exige separar la lógica de la UI y contar con pruebas automatizadas obligatorias de lógica de negocio. Ubicar las mutaciones (`addItemToCart`, `updateItemQuantity`, `removeItemFromCart`) y cálculos de totales en `src/logic/` permite testear exhaustivamente todos los casos borde con Vitest a nivel unitario puro sin renderizar componentes de React. *(RF-4, RF-5, RNF-5, RNF-6)*
- Alternativa descartada: **Lógica concentrada en callbacks y `setState` dentro del componente visual**. Acopla el cálculo a la UI y entorpece las pruebas unitarias.

**D3 — Persistencia en `localStorage` con validación Zod defensiva.**
- Justificación: Los datos de `localStorage` constituyen entradas externas que pueden estar corruptas o desactualizadas; AGENTS.md exige validar estrictamente toda entrada con esquemas Zod. Si el JSON no cumple con `CartItemSchema`, se descarta y se inicializa el carrito vacío, previniendo excepciones en tiempo de ejecución. *(RF-7)*
- Alternativa descartada: **Parseo directo con `JSON.parse` sin validación de esquema**. Riesgo de fallas catastróficas en la UI si el formato almacenado cambia o se corrompe.

**D4 — Panel lateral (Drawer) accesible con clases Tailwind v4 y primitivas locales.**
- Justificación: Implementar el Drawer utilizando tokens de Tailwind v4 y las primitivas visuales de `src/components/ui/` garantiza total apego al sistema de diseño "IDE institucional" ([specs/00-design-system/spec.md](file:///c:/Users/HP/Documents/Apps%20webs%20reactiva/Proyecto-webs-reactivas/specs/00-design-system/spec.md)) sin requerir librerías de componentes complejas. Cumple accesibilidad con captura de teclado (`Escape`) y gestión de foco. *(RF-2, RNF-3, RNF-4)*
- Alternativa descartada: **Instalar Radix UI Dialog o Vaul**. Viola la regla de no agregar dependencias al stack innecesariamente (§1).

**D5 — Precios representados como números enteros en pesos chilenos (CLP).**
- Justificación: En el peso chileno no existen centavos ni fracciones. Usar enteros (`6000`, `12000`) validados con `z.number().int().positive()` elimina por completo los problemas de precisión de punto flotante de JavaScript (ej. `0.1 + 0.2 !== 0.3`). *(RF-5, RF-8)*
- Alternativa descartada: **Strings formateados en el JSON (ej. `"$6.000"`)**. Obligaría a parsear cadenas y expresiones regulares en cada operación aritmética.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización N.*

- **Lógica pura obligatoria (§4):**
  - `cartCalculations.test.ts`:
    - `calculateItemSubtotal(6000, 2)` retorna `12000`. *(Verifica RF-5)*
    - `calculateCartTotal` calcula la suma acumulada de subtotales de múltiples ítems. *(Verifica RF-5)*
    - `calculateTotalQuantity` suma las unidades totales de todos los artículos. *(Verifica RF-1)*
    - `formatPriceCLP(6000)` produce `"$6.000"`. *(Verifica RF-5)*
  - `cartOperations.test.ts`:
    - `addItemToCart` en carrito vacío crea el ítem con cantidad 1. *(Verifica RF-3)*
    - `addItemToCart` con producto existente incrementa la cantidad en 1 sin duplicar fila. *(Verifica RF-3)*
    - `updateItemQuantity` incrementa y decrementa cantidades correctamente. *(Verifica RF-4)*
    - `updateItemQuantity` con cantidad 0 o negativa remueve el ítem. *(Verifica RF-4)*
    - `removeItemFromCart` elimina el producto por su `productId`. *(Verifica RF-4)*
    - `clearCart` vacía la lista completamente. *(Verifica RF-4)*
  - `cartStorage.test.ts`:
    - `loadCartFromStorage` lee y valida datos válidos de `localStorage`. *(Verifica RF-7)*
    - `loadCartFromStorage` ante JSON corrupto o esquema incompatible retorna `[]` sin error. *(Verifica RF-7)*
    - `saveCartToStorage` serializa y escribe en `localStorage`. *(Verifica RF-7)*
  - `productParse.test.ts`:
    - Valida que productos sin `price` o con precios inválidos (negativos o decimales) sean rechazados por Zod. *(Verifica RF-8)*

- **Presentación (smoke tests opcionales, §4):**
  - `Header.test.tsx`: Verifica que el botón de carrito renderice el badge numérico con la cantidad correcta cuando `totalCount > 0`.
  - `ProductDetailPage.test.tsx`: Verifica que se renderice el precio del producto y el botón "Agregar al carrito".

- **Verificación de contrato por QA (manual):**
  - Abrir la tienda, ir al detalle de un producto y hacer clic en "Agregar al carrito" -> el drawer se abre con el producto agregado.
  - Modificar cantidades (+ y -) -> el total y subtotal se actualizan al instante.
  - Recargar la página (F5) -> los productos en el carrito persisten gracias a `localStorage`.
  - Pulsar la tecla `Escape` o hacer clic en el backdrop -> el drawer se cierra y el foco regresa al botón del encabezado.

- **Ausencia de red:** No existen peticiones a APIs externas ni backend; las pruebas corren de forma síncrona en Vitest.
- **Comando de cierre:** `npm run check` (verificación de tipos TypeScript con `tsc --noEmit` y suite de Vitest) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| Botón interactivo en `Header.tsx` con badge de unidades | RF-1 |
| Componente `CartDrawer.tsx` con accesibilidad y backdrop | RF-2 |
| Botón "Agregar al carrito" en `ProductDetailPage.tsx` | RF-3 |
| Funciones puras de mutación en `cartOperations.ts` y botones en `CartItemRow.tsx` | RF-4 |
| Funciones de cálculo en `cartCalculations.ts` y desglose visual en el drawer | RF-5 |
| Componente `CartEmptyState.tsx` con enlace a catálogo | RF-6 |
| Módulo de persistencia `cartStorage.ts` con validación Zod | RF-7 |
| Actualización de `products.json` y esquema Zod `ProductSchema` | RF-8 |
| Pruebas unitarias de lógica pura en Vitest | Verificación RF-1 a RF-8 (§4) |

---
*Nota:* El plan asume un Drawer modal lateral para optimizar la experiencia en compras rápidas sin recarga de pantalla. El siguiente paso según el flujo de trabajo es generar el desglose de tareas en `specs/004-shopping-cart/tasks.md`.
