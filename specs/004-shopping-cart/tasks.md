# Tasks 004 — Carrito de compras (Panel lateral)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 004 del frontend y modelo de productos**
    RF: RF-1…RF-8 (base para todo)
    Hecho cuando: conozco `products.json`, `productParse.ts`, `Header.tsx` (marcador `ComingSoonItem` para carrito), `ProductDetailPage.tsx` y el sistema de diseño (`specs/00-design-system`), y el plan ya indica dónde aterriza cada módulo nuevo.

## Fase 1 — Datos y lógica pura del carrito (depende de 1)

- [ ] **2. Actualizar modelo de datos y esquema Zod de productos con `price`**
    RF: RF-8
    Hecho cuando: añado el campo `price` (enteros en pesos chilenos CLP) a cada producto en `products.json`, actualizo `ProductSchema` en `productParse.ts` validando enteros positivos, adapto fixtures y los tests existentes de parseo pasan sin errores.

- [ ] **3. Implementar tipos Zod y cálculos aritméticos del carrito (`cartTypes.ts`, `cartCalculations.ts`)**
    RF: RF-1, RF-5
    Hecho cuando: defino `CartItemSchema` con Zod, implemento `calculateItemSubtotal`, `calculateCartTotal`, `calculateTotalQuantity` y `formatPriceCLP` (formateo en moneda chilena), y sus tests unitarios en `cartCalculations.test.ts` pasan.

- [ ] **4. Implementar operaciones de mutación inmutables del carrito (`cartOperations.ts`)**
    RF: RF-3, RF-4
    Hecho cuando: implemento `addItemToCart` (agregado de nuevos ítems e incremento de existentes sin duplicar), `updateItemQuantity` (incrementar, decrementar y remoción automática al llegar a 0), `removeItemFromCart` y `clearCart`, y sus tests unitarios en `cartOperations.test.ts` pasan.

- [ ] **5. Implementar persistencia defensiva en `localStorage` (`cartStorage.ts`)**
    RF: RF-7
    Hecho cuando: implemento `loadCartFromStorage` con validación Zod defensiva (descartando datos corruptos y retornando `[]` de forma segura) y `saveCartToStorage`, y sus pruebas unitarias en `cartStorage.test.ts` pasan.

## Fase 2 — Estado global e infraestructura de UI (depende de 3, 4, 5)

- [ ] **6. Crear `CartContext` y hook `useCart`**
    RF: RF-1, RF-2, RF-3, RF-4, RF-7
    Hecho cuando: implemento el proveedor de contexto React que expone el estado (`items`, `isOpen`, `totalCount`, `totalAmount`) y las acciones (`openCart`, `closeCart`, `toggleCart`, `addItem`, `updateQuantity`, `removeItem`, `clearCart`), sincronizado con `cartStorage`, y lo monto en `App.tsx`.

- [ ] **7. Implementar componentes del panel lateral (`CartItemRow`, `CartEmptyState`, `CartDrawer`)**
    RF: RF-2, RF-4, RF-5, RF-6 (más RNF-3, RNF-4)
    Hecho cuando: renderizo el panel lateral en el costado derecho con fondo oscuro semi-transparente, foco atrapado accesible, cierre con `Escape`, botón "✕" y clic en backdrop, bloqueo de scroll en el body, filas con controles de cantidad y eliminación, desglose de totales y estado vacío con botón "Explorar catálogo".

## Fase 3 — Integración en vistas (depende de 2, 6, 7)

- [ ] **8. Conectar el activador del carrito en `Header.tsx`**
    RF: RF-1
    Hecho cuando: reemplazo el marcador "Próximamente" en el encabezado por un botón accesible que abre el panel lateral, muestra el badge numérico con la cantidad total acumulada cuando `totalCount > 0`, y cuenta con atributos `aria-expanded` y etiquetas en español.

- [ ] **9. Actualizar `ProductDetailPage.tsx` con precio y botón "Agregar al carrito"**
    RF: RF-3, RF-8
    Hecho cuando: muestro el precio formateado en el detalle del producto, renderizo el botón primario "Agregar al carrito" que añade el producto al carrito y abre automáticamente el drawer lateral, y oculto el botón si el producto no existe.

## Fase 4 — Verificación y cierre (depende de 8, 9)

- [ ] **10. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-8, RNF-1…RNF-7
    Hecho cuando: verifico manualmente el flujo completo (agregar desde detalle, modificar cantidades, eliminar, vaciar, navegación al catálogo desde estado vacío, recarga F5 persistiendo datos, cierre con Escape y clic fuera, navegación por teclado), asegurando ausencia de llamadas de red y consola limpia.

- [ ] **11. Cierre: `npm run check` en verde**
    RF: RNF-6, criterio de finalización 10
    Hecho cuando: `npm run check` (tipos de TypeScript + tests de Vitest) pasa sin errores y anoto el resultado en la respuesta final.
