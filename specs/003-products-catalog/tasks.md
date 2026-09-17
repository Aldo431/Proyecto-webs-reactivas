# Tasks 003 — Catálogo de productos con filtros por categoría

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 003 del frontend y de las specs 001/002**
    RF: RF-1…RF-6 (base para todo)
    Hecho cuando: conozco `App.tsx`, la tabla `routeParsers`, `useHashRouter` (constantes `ROUTE_*`), `HomePage`, `ProductGrid`/`ProductCard`, `Header` (`backLabel`), `productParse`/`productLookup` y `products.json`, y el plan ya indica dónde aterriza cada módulo nuevo.

## Fase 1 — Lógica pura y datos (depende de 1)

- [x] **2. Instalar `react-router-dom@^7` y montar `HashRouter` en `App` con las 5 rutas**
    RF: RF-6 (más RF-1…RF-5 de 001/002, que migran)
    Hecho cuando: instalo la dependencia (misma versión mayor que el Lab5), `App` monta `/`, `/registro`, `/iniciar-sesion`, `/producto/:id` y `/catalogo` más `path="*"` hacia el inicio, y las vistas 001/002 se siguen viendo igual.

- [x] **3. Implementar `getCategories`, `filterProductsByCategory` y `getFeaturedProducts`**
    RF: RF-1, RF-2, RF-3, RF-4
    Hecho cuando: deduzco categorías únicas en orden de aparición, filtro por categoría (incluido `[]` ante desconocida y todos ante `null`) y recorto los N primeros (incluidos bordes N mayor y N = 0), y sus tests unitarios pasan.

## Fase 2 — UI: catálogo e inicio (depende de 2, 3)

- [x] **4. Eliminar el router propio y migrar navegación y tests**
    RF: RF-1, RF-6 (más regresión 001/002)
    Hecho cuando: elimino `routeParser`, `useHashRouter`, `ROUTE_*`, `navigate()` y `buildProductRoute` (reemplazado por `productPath`), migro `Header`, `AuthBar` y `ProductCard` a `useNavigate`/`Link` sin cambios visuales, y los tests de hash quedan reemplazados por `MemoryRouter` en verde.

- [x] **5. Crear `CategoryFilter` (botones con `aria-pressed`)**
    RF: RF-3 (más RNF-4)
    Hecho cuando: renderizo "Todas" primero más un botón por categoría, el activo se indica como presionado, todo es focable por teclado y solo recibo estado por props (sin lógica de filtrado dentro).

- [x] **6. Crear `CatalogPage` (título, filtros, grilla, vacío)**
    RF: RF-2, RF-3, RF-4, RF-5
    Hecho cuando: muestro "Catálogo" como encabezado, el filtro activo en estado local (inicial "Todas"), una tarjeta enlazada por producto del resultado, "No hay productos en esta categoría." sin tarjetas ante resultado vacío, y `Header` con "Volver al inicio".

- [x] **7. Actualizar `HomePage` (Ver Catálogo, destacados, Ver más productos)**
    RF: RF-1
    Hecho cuando: el héroe muestra "Ver Catálogo", la sección muestra solo los destacados con "Ver más productos" debajo, y ambos navegan al catálogo sin recargar.

## Fase 3 — Integración y cierre (depende de 4, 6, 7)

- [x] **8. Verificar accesibilidad y responsividad del catálogo**
    RF: RNF-3, RNF-4
    Hecho cuando: recorro inicio → catálogo → detalle → inicio solo con teclado, cada filtro anuncia su presionado, y filtros y grilla no se rompen en móvil ni en escritorio.

- [x] **9. Verificación QA según criterios de finalización**
    RF: RF-1…RF-6 (contrato)
    Hecho cuando: pruebo ambos accesos, cada filtro y la vuelta a "Todas", URL directa y recarga (verifico que el filtro reinicia a "Todas"), atrás/adelante del navegador, tarjeta del catálogo hacia su detalle, y regreso por "Volver al inicio" y por logo; sin errores en consola ni llamadas de red.

- [x] **10. Cierre: `npm run check` en verde**
    RF: RNF-7, criterio de finalización 8
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.
