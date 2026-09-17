# Tasks 002 — Página individual de producto (detalle por clic en ProductCard)

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 002 del frontend y de la spec 001**
    RF: RF-1…RF-5 (base para todo)
    Hecho cuando: conozco `App.tsx`, `useHashRouter`, `routeParser` (tipo `Route` actual), `ProductCard`/`ProductGrid`, `Header`, `productParse` y `products.json`, y el plan ya indica dónde aterriza cada módulo nuevo.

## Fase 1 — Lógica pura y datos (depende de 1)

- [x] **2. Extender `routeParser` a unión discriminada + `buildProductRoute`**
    RF: RF-1, RF-5
    Hecho cuando: `parseRoute` conserva las rutas 001 y reconoce `#/producto/:id` (decodificando el id una vez), devuelve `unknown` ante `#/producto`, `#/producto/` y segmentos extra, y `buildProductRoute` hace round-trip con el parser; sus tests unitarios pasan.

- [x] **3. Implementar `getProductById` en `logic/productLookup`**
    RF: RF-2, RF-3
    Hecho cuando: resuelve cada id del catálogo, devuelve `undefined` con id inexistente, vacío y con distinta capitalización, y sus tests unitarios pasan.

- [x] **4. Migrar `useHashRouter` y `App.tsx` al nuevo tipo `Route`**
    RF: RF-1, RF-4, RF-5
    Hecho cuando: el hook expone la unión discriminada sin cambiar su suscripción a `hashchange`, `App` discrimina por `route.name` (incluida la rama `product`), el fallback de `unknown` se conserva y los tests 001 que asertaban `Route` como string quedan migrados y en verde.

## Fase 2 — UI: tarjeta y detalle (depende de 2, 3)

- [x] **5. Convertir `ProductCard` en enlace accesible al detalle**
    RF: RF-1 (más RNF-4)
    Hecho cuando: cada tarjeta renderiza un `<a href="#/producto/<id>">` con el mismo contenido visual, focable por teclado y con nombre accesible igual al producto, sin cambiar su firma de props.

- [x] **6. Crear `ProductDetailPage` (detalle + no-encontrado)**
    RF: RF-2, RF-3, RF-4 (más RNF-3, RNF-4)
    Hecho cuando: con id existente muestro imagen (con texto alternativo), nombre como encabezado principal, categoría, descripción y `Header` con "Volver al inicio" (prop `backLabel`); con id inexistente muestro "Producto no encontrado" con "Volver al inicio" y sin datos ajenos; el layout apila en móvil y usa dos columnas en escritorio.

## Fase 3 — Integración y cierre (depende de 4, 5, 6)

- [x] **7. Montar la rama `product` en el router con restauración de scroll**
    RF: RF-1, RF-5
    Hecho cuando: activar una tarjeta presenta su detalle sin recargar el sitio, la URL queda en `#/producto/<id>` y entrar al detalle deja el scroll al inicio.

- [x] **8. Verificar accesibilidad y responsividad del detalle**
    RF: RNF-3, RNF-4
    Hecho cuando: recorro inicio → detalle → inicio solo con teclado, cada enlace tiene nombre accesible, la imagen conserva su texto alternativo y el detalle no se rompe en móvil ni en escritorio.

- [x] **9. Verificación QA según criterios de finalización**
    RF: RF-1…RF-5 (contrato)
    Hecho cuando: pruebo clic y teclado en cada tarjeta, URL directa y recarga en id existente e inexistente, atrás/adelante del navegador, y regreso por "Volver al inicio" y por logo; sin errores en consola ni llamadas de red.

- [x] **10. Cierre: `npm run check` en verde**
    RF: RNF-7, criterio de finalización 7
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.
