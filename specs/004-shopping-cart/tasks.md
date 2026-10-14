# Tasks 004 — Carrito de compras (Panel lateral)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 004 del frontend y modelo de productos**
    RF: RF-1…RF-9 (base para todo)
    Hecho cuando: conozco `products.json` (sin `price`), `productParse.ts` (sin `price`), `Header.tsx` (marcador `ComingSoonItem` de carrito), `ProductCard.tsx` (`Link` completo), `ProductDetailPage.tsx` y el sistema de diseño (`specs/00-design-system`), y el plan ya indica dónde aterriza cada módulo nuevo.

## Fase 1 — Datos y lógica pura del carrito (depende de 1)

- [x] **2. Actualizar modelo de datos y esquema Zod de productos con `price`**
    RF: RF-8
    Hecho cuando: añado `price` a cada producto en `products.json` (6000/12000/1500), actualizo `ProductSchema` en `productParse.ts` con `z.number().int().positive()`, adapto fixtures y los tests de parseo (rechazo sin `price`, negativos y decimales) pasan.

- [x] **3. Implementar tipos Zod y cálculos del carrito (`cartTypes.ts`, `cartCalculations.ts`)**
    RF: RF-1, RF-5
    Hecho cuando: defino `CartItemSchema` con Zod e implemento `calculateItemSubtotal`, `calculateCartTotal`, `calculateTotalQuantity`, `getCartBadgeText` (`null` en 0, número en 1–99, `"99+"` sobre 99) y `formatPriceCLP` (`Intl.NumberFormat('es-CL')`), y sus tests unitarios en `cartCalculations.test.ts` pasan.

- [x] **4. Implementar operaciones inmutables del carrito (`cartOperations.ts`)**
    RF: RF-3, RF-4, RF-9
    Hecho cuando: implemento `addItemToCart` (crea con 1 o incrementa sin duplicar ni tope), `updateItemQuantity` (incrementa/decrementa y remueve en 0 o negativo), `removeItemFromCart` y `clearCart`, y sus tests unitarios en `cartOperations.test.ts` pasan.

- [x] **5. Implementar persistencia en `localStorage` clave `cart` (`cartStorage.ts`)**
    RF: RF-7
    Hecho cuando: implemento `loadCartFromStorage(products)` con validación Zod (corrupto → `[]`), descarte de `productId` inexistentes, actualización de `name`/`price`/`image` desde el catálogo manteniendo `quantity`, y `saveCartToStorage` en clave `cart` con fallback en memoria si está deshabilitado o excede cuota (sin sync entre pestañas), y sus tests en `cartStorage.test.ts` pasan.

## Fase 2 — Estado global e infraestructura de UI (depende de 3, 4, 5)

- [x] **6. Crear `CartContext` y hook `useCart`**
    RF: RF-1, RF-2, RF-3, RF-4, RF-7, RF-9
    Hecho cuando: implemento el proveedor que expone `items`, `isOpen`, `totalCount`, `totalAmount`, `openCart`, `closeCart`, `toggleCart`, `addItem` (abre el drawer), `updateQuantity`, `removeItem` y `clearCart`, lo sincronizo con `cartStorage` y lo monto en `App.tsx` con `<CartDrawer />` a nivel raíz.

- [x] **7. Implementar panel lateral (`CartItemRow`, `CartEmptyState`, `CartDrawer`)**
    RF: RF-2, RF-4, RF-5, RF-6, RF-9 (más RNF-3, RNF-4, RNF-5)
    Hecho cuando: renderizo el drawer derecho (`role="dialog"`, `aria-modal`, `aria-labelledby`) con backdrop, body lock y scroll interno, responsive (`calc(100vw - 32px)` en móvil, máx 420 px), animación `base` 250 ms desactivada con `reduced-motion`, cierre con "✕" (`aria-label="Cerrar carrito"`), backdrop y `Escape`, retorno de foco al activador y cierre al navegar; filas con `+`/`-`/papelera y `aria-label` en español, subtotal/total en `font-mono`, pie con "Vaciar carrito" (limpia directo) y "Finalizar compra" (vacía y cierra), y vacío con "Tu carrito está vacío." + "Explorar catálogo" hacia `#/catalogo`.

## Fase 3 — Integración en vistas (depende de 2, 6, 7)

- [x] **8. Conectar el activador del carrito en `Header.tsx`**
    RF: RF-1
    Hecho cuando: reemplazo el marcador "Próximamente" por un botón que abre el panel, muestra el badge con `getCartBadgeText` solo cuando `totalCount > 0`, expone `aria-expanded` correcto y etiquetas en español.

- [x] **9. Agregar y precio en detalle y tarjetas (`ProductDetailPage.tsx`, `ProductCard.tsx`)**
    RF: RF-3, RF-8
    Hecho cuando: muestro el precio formateado en detalle y en cada tarjeta, renderizo "Agregar al carrito" en el detalle (oculto en "Producto no encontrado") y "Agregar" fuera del `Link` en la tarjeta (con `aria-label="Agregar <nombre> al carrito"`) que suma 1, abre el drawer y no navega al detalle.

## Fase 4 — Verificación y cierre (depende de 8, 9)

- [x] **10. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-9, RNF-1…RNF-8
    Hecho cuando: verifico manualmente agregar desde detalle y tarjetas, `+`/`-`/papelera/vaciar, "Finalizar compra" vacía y cierra, "Explorar catálogo" cierra y va a `#/catalogo`, recarga F5 persiste desde clave `cart`, cierre con `Escape`/backdrop/✕ con retorno de foco, teclado completo, 360 px sin scroll horizontal y `reduced-motion` sin deslizamiento, sin llamadas de red y con consola limpia.

- [x] **11. Cierre: `npm run check` en verde**
    RF: RNF-7, criterio de finalización 11
    Hecho cuando: `npm run check` (tipos de TypeScript + tests de Vitest) pasa sin errores y anoto el resultado en la respuesta final.
