# Tasks 009 — Búsqueda, orden y paginación del catálogo

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 009 del catálogo actual y la query existente**
    RF: RF-1…RF-7 (base para todo)
    Hecho cuando: conozco `productListQuerySchema` (solo `categoria`/`featured`/`ids`), `listProducts` (orden fijo, arreglo completo), `fetchProducts`/`useProductList`, `CatalogPage.tsx` (una petición + filtro local + `?categoria`) y el plan ya indica dónde aterriza cada módulo nuevo.

## Fase 1 — Esquemas y backend (depende de 1)

- [x] **2. Extender la query y el objeto paginado en `@tiendadcc/utils`**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: añado `q` (trim, 1–100), `orden` (enum de 4, por defecto `recientes`), `pagina` (entero ≥ 1, por defecto 1), `min`/`max` (enteros ≥ 0, con `min <= max`), las constantes `SEARCH_MAX_LENGTH`, `CATALOG_PAGE_SIZE` (9) y `SORT_ORDERS`, más `productPageSchema`/`ProductPage`, y sus tests en `productSchemas.test.ts` pasan.

- [x] **3. Buscar, ordenar y filtrar por precio en el servicio (`listProductPage`)**
    RF: RF-1, RF-2, RF-3
    Hecho cuando: implemento el filtro de nombre con regex escapado + collation `es`, el mapa de 4 órdenes con desempate, el rango `min`/`max` en AND y el índice `{ price: 1, createdAt: -1, _id: -1 }`, y sus tests supertest (mayúsculas, tildes, especiales literales, órdenes, rango, `min > max` → 400) pasan.

- [x] **4. Paginar en el servidor y responder objeto o arreglo (`GET /`)**
    RF: RF-4
    Hecho cuando: implemento conteo + `skip`/`limit` de 9 con ajuste a la última página, respondo el objeto `{ products, total, pagina, porPagina, totalPaginas }` solo con claves nuevas y el arreglo simple sin ellas, y sus tests (totales, página excedida, `pagina` inválida → 400, compatibilidad) pasan.

## Fase 2 — Cliente API y lógica pura (depende de 2, 4)

- [x] **5. Pedir páginas al backend (`fetchCatalogPage`)**
    RF: RF-4, RF-6
    Hecho cuando: implemento `fetchCatalogPage` en `productApi.ts` (arma `q`/`orden`/`pagina`/`min`/`max`/`categoria`, valida con `productPageSchema`, errores en español) sin tocar `fetchProducts`, y sus tests con `fetch` simulado pasan.

- [x] **6. Parsear y construir los parámetros de la URL (`catalogQuery.ts`)**
    RF: RF-6, RF-7
    Hecho cuando: implemento `CATALOG_DEFAULTS`, `parseCatalogParams` (inválidos → defectos), `buildCatalogParams` (omite defectos), `SORT_OPTIONS` en español y `SEARCH_DEBOUNCE_MS` (300), y sus tests de roundtrip en `catalogQuery.test.ts` pasan.

- [x] **7. Cargar páginas con debounce (`useCatalogPage`)**
    RF: RF-6
    Hecho cuando: implemento el hook que pide por cada cambio efectivo (debounce solo en `q`), descarta respuestas tardías y expone `products`/`total`/`pagina`/`totalPaginas` con `retry`, y sus tests con temporizadores simulados pasan.

## Fase 3 — UI del catálogo (depende de 5, 6, 7)

- [x] **8. Implementar controles (buscador, orden, precios, paginación)**
    RF: RF-6 (más RNF-5, RNF-6, RNF-7)
    Hecho cuando: renderizo `CatalogSearchBar` (`role="searchbox"` con `label`), `CatalogSortSelect` (nativo con las 4 opciones), `CatalogPriceFilter` (mín/máx en CLP) y `CatalogPagination` (`nav` con `aria-current="page"`, oculta con una sola página), apilados en móvil sin scroll horizontal.

- [x] **9. Integrar `CatalogPage.tsx` con la URL como única fuente**
    RF: RF-6, RF-7
    Hecho cuando: elimino el filtrado local, escribo todos los parámetros con un único actualizador (`replace: true`, reinicio a página 1 salvo al paginar), muestro el total en `role="status"` con "Página X de Y", el vacío con "Limpiar filtros" y conservo carga/error con "Reintentar" y el `CategoryFilter`.

## Fase 4 — Verificación y cierre (depende de 8, 9)

- [x] **10. Verificación QA según criterios de finalización y accesibilidad**
    RF: RF-1…RF-7, RNF-1…RNF-9
    Hecho cuando: verifico manualmente buscar y ordenar, acotar por precio, paginar, recargar y compartir enlaces, `?pagina=999` y parámetros inválidos, atrás/adelante, "Limpiar filtros" y "Reintentar" sin red, 360 px sin scroll y todo por teclado, con consola limpia.

- [x] **11. Cierre: `npm run check` en verde**
    RF: RNF-8, criterio de finalización 10
    Hecho cuando: `npm run check` de raíz (tipos + tests de los tres workspaces) pasa sin errores y anoto el resultado en la respuesta final.
