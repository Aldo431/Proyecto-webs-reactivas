# Plan 009 — Búsqueda, orden y paginación del catálogo

Plan de implementación para la spec `009-product-search`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-7. Cada sección indica qué RF atiende. Las specs 003 y 008 quedan congeladas: este plan solo toca lo que la 009 declara (nuevo o `modifica 00N/RF-x`).

## 1. Estructura de módulos
*Cubre: RF-1 … RF-7.*

Se trabaja sobre lo construido en 008: `productListQuerySchema` en `@tiendadcc/utils`, `GET /api/products` con filtros `categoria`/`featured`/`ids`, `productApi.ts` (`fetchProducts`), `useProductList` y `CatalogPage.tsx` con filtro local por categoría. La lógica vive en el servicio del backend y en funciones/hooks puros del frontend, nunca en componentes (§3).

- **Esquemas compartidos** — `utils/src/productSchemas.ts` *(RF-1, RF-2, RF-3, RF-4, RF-5)*
  - `SEARCH_MAX_LENGTH = 100`, `CATALOG_PAGE_SIZE = 9`, `SORT_ORDERS = ["recientes", "precio-menor", "precio-mayor", "nombre"] as const`.
  - `productListQuerySchema` suma: `q` (string con `trim`; `""` o solo espacios → `undefined` vía `preprocess`; 1–100 caracteres, mensajes en español), `orden` (`z.enum(SORT_ORDERS)`, por defecto `"recientes"`), `pagina` (`z.coerce.number().int().min(1)`, por defecto 1), `min`/`max` (`z.coerce.number().int().min(0)`, opcionales) y `refine(min <= max, "El precio mínimo no puede superar al máximo.")`.
  - `productPageSchema = { products: z.array(productSchema), total: int ≥ 0, pagina: int ≥ 1, porPagina: literal 9, totalPaginas: int ≥ 0 }` y su tipo `ProductPage`; reexport desde `utils/src/index.ts`.

- **Backend (Express + Mongoose)** — `apps/backend/src/` *(RF-1, RF-2, RF-3, RF-4)*
  - `services/productService.ts`: nueva `listProductPage(query)` sin tocar `listProducts` (que sigue devolviendo el arreglo completo para inicio, carrito, favoritos e historial).
    - Filtro: los existentes (`categoria`, `featured`, `ids`) más `name: { $regex: escapeRegExp(q), $options: "i" }` si hay `q`, y `price: { $gte: min, $lte: max }` según corresponda (AND de todo).
    - Orden: mapa `recientes → { createdAt: -1, _id: -1 }` (existente `NEWEST_FIRST`), `precio-menor → { price: 1, createdAt: -1, _id: -1 }`, `precio-mayor → { price: -1, createdAt: -1, _id: -1 }`, `nombre → { name: 1, _id: 1 }`, todo con collation `{ locale: "es", strength: 2 }` (insensible a mayúsculas y tildes, RF-1/RF-2).
    - Paginación: `total = countDocuments(filter)`; `totalPaginas = ceil(total / 9)`; si `pagina > totalPaginas` y hay coincidencias se usa la última; `skip((pagina-1)*9).limit(9)` con la proyección liviana `READ_PROJECTION` y el mismo `populate` de vendedor.
    - Índice nuevo en `models/Product.ts`: `{ price: 1, createdAt: -1, _id: -1 }` para los órdenes por precio.
  - `controllers/productsController.ts` (`GET /`): valida con el esquema extendido (`400` en español si falla); si la query cruda trae alguna clave nueva (`q`, `orden`, `pagina`, `min`, `max`) responde el objeto paginado, si no delega en `listProducts` y responde el arreglo simple de 008 (compatibilidad, RF-4).

- **Lógica pura del frontend** — `src/logic/` *(RF-5, RF-6, RF-7)*
  - `catalogQuery.ts` (nuevo): `CATALOG_DEFAULTS = { q: "", orden: "recientes", pagina: 1, min: null, max: null, categoria: null }`; `parseCatalogParams(params: URLSearchParams) → CatalogQuery` (cada valor inválido cae a su defecto, sin errores); `buildCatalogParams(query) → URLSearchParams` (omite los valores por defecto); `SORT_OPTIONS = [{ value: "recientes", label: "Más recientes" }, { value: "precio-menor", label: "Precio: menor a mayor" }, { value: "precio-mayor", label: "Precio: mayor a menor" }, { value: "nombre", label: "Nombre A–Z" }]`; `SEARCH_DEBOUNCE_MS = 300`.
  - `productApi.ts`: nuevo `fetchCatalogPage(filters) → CatalogPageResult` que arma `q/orden/pagina/min/max/categoria` y valida el objeto con `productPageSchema` (discriminado `ok` | error en español, como el resto del cliente).
  - `useCatalogPage.ts` (nuevo): recibe la `CatalogQuery` ya parseada; aplica el debounce solo a `q` (300 ms), pide la página por cada cambio efectivo, descarta respuestas tardías (patrón `isCurrent` de `useProductList`) y expone `{ status: "loading" | "error" | "success", products, total, pagina, totalPaginas, retry }`.

- **Presentación** — `src/pages/` y `src/components/` *(RF-6, RF-7)*
  - `pages/CatalogPage.tsx`: la URL (`useSearchParams`) sigue siendo la única fuente de verdad; un único actualizador escribe todos los parámetros con `replace: true` y reinicia a página 1 ante cualquier cambio que no sea paginar. El filtrado local (`filterProductsByCategory`) se elimina: todo lo resuelve el backend. Conserva `CategoryFilter`, carga/error/reintento y el mensaje de categoría vacía.
  - `components/CatalogSearchBar.tsx` (nuevo): `label` "Buscar por nombre" + `input role="searchbox"`, controlado, sin botón de envío (filtra al escribir con debounce).
  - `components/CatalogSortSelect.tsx` (nuevo): `label` "Ordenar por" + `<select>` nativo con `SORT_OPTIONS`.
  - `components/CatalogPriceFilter.tsx` (nuevo): `label`s "Precio mínimo" y "Precio máximo", inputs numéricos enteros en CLP; valores inválidos no se envían (se ignoran hasta ser válidos).
  - `components/CatalogPagination.tsx` (nuevo): `<nav aria-label="Paginación">` con anterior/siguiente y números, `aria-current="page"` en la activa, oculto si hay una sola página.
  - Total en `role="status"` ("N producto(s) encontrado(s)") y "Página X de Y"; vacío con "No se encontraron productos con esos criterios." + botón "Limpiar filtros" (restaura `CATALOG_DEFAULTS`).

## 2. Modelo de datos JSON
*Cubre: RF-4.*

Sin cambios al modelo `Product` ni al contrato público (se reutilizan tal cual). Solo aparece una forma nueva de respuesta para el listado paginado:

```json
{
  "products": [
    {
      "id": "68f1c2a9b3d4e5f60718293a",
      "name": "Taza DCC",
      "description": "Taza de cerámica con el logo del DCC.",
      "category": "Tazas",
      "price": 6000,
      "image": "/images/taza-dcc.png",
      "featured": true,
      "seller": { "id": "68f1c2a9b3d4e5f60718293b", "username": "tiendadcc", "displayName": "TiendaDCC" },
      "createdAt": "2026-10-14T12:00:00.000Z",
      "updatedAt": "2026-10-14T12:00:00.000Z"
    }
  ],
  "total": 25,
  "pagina": 2,
  "porPagina": 9,
  "totalPaginas": 3
}
```

(Claves en inglés; textos de usuario en español solo en la UI. La respuesta se valida con `productPageSchema` de `@tiendadcc/utils` antes de usarse — AGENTS.md.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Búsqueda con regex escapado + collation `es`, sin índice full-text.**
- Justificación: `q` debe ser subcadena literal insensible a mayúsculas y tildes sobre `name` (RF-1). Escapar con `escapeRegExp` cierra la inyección de regex (RNF-3) y la collation `{ locale: "es", strength: 2 }` da el folding sin código extra.
- Alternativa descartada: **Atlas Search o índice de texto**. Requiere servicio/índice externo fuera del stack y del alcance (§1, Fuera de alcance).

**D2 — Orden con desempate total y collation.**
- Justificación: Los cuatro órdenes (RF-2) necesitan un orden determinista para que las páginas no repitan ni salten productos al paginar: precio y nombre desempatan con recientes/`_id`.
- Alternativa descartada: **Ordenar en el cliente**. Obligaría a traer todo el catálogo y rompería la paginación del servidor (RNF-2).

**D3 — Paginación en servidor con objeto con totales, manteniendo el arreglo simple.**
- Justificación: El catálogo crece con publicaciones; traer todo ya no escala (RNF-4). El frontend necesita `total`/`totalPaginas` para numerar (RF-4, RF-6). La respuesta objeto solo aparece con claves nuevas para no romper inicio, carrito, favoritos e historial, que siguen con el arreglo de 008.
- Alternativa descartada: **Paginar en el cliente sobre la carga completa**. Mantiene el problema de tamaño y contradice RF-4.

**D4 — Tamaño de página fijo en 9, no parametrizable.**
- Justificación: 9 llena una grilla 3×3 en escritorio y evita que un cliente pida páginas gigantes (RNF-3, RNF-4). La spec lo deja revisable.
- Alternativa descartada: **Parámetro `porPagina`**. Expone superficie de abuso y complica la validación sin beneficio pedido.

**D5 — El catálogo pide al backend por cada cambio, con debounce solo en el texto.**
- Justificación: Con paginación servidora el filtro local (008/RF-14) ya no puede funcionar; cada criterio viaja en la petición (RF-6). El debounce de 300 ms evita una petición por tecla (RNF-4); orden, precios, categoría y página se piden de inmediato.
- Alternativa descartada: **Conservar el filtro local y paginarlo en memoria**. Exige descargar todo el catálogo en cada visita.

**D6 — Toda la vista vive en la URL con `replace: true` y fallbacks silenciosos.**
- Justificación: Recarga, enlaces compartibles y atrás/adelante deben reproducir la vista (RF-7, como `categoria` en 003). `replace: true` evita ensuciar el historial y los valores inválidos caen a sus defectos en el parseo del cliente (la API, en cambio, responde `400`, cada capa con su contrato).
- Alternativa descartada: **Estado solo en memoria**. Se pierde al recargar y no es compartible.

**D7 — Validación Zod en `utils/` como única fuente de la query.**
- Justificación: AGENTS.md exige validar toda entrada externa con Zod; el esquema compartido lo usan el controlador (400 en español) y el cliente (tipos + parseo de URL), como ya hace 008 con el resto de la query (RF-5, §6 para mensajes).
- Alternativa descartada: **Validar a mano en cada lado**. Duplica reglas y diverge con el tiempo.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 10.*

- **Lógica pura obligatoria (§4):**
  - `utils` (`productSchemas.test.ts`): `q` válido/`""`/espacios/`undefined`, `q` de 101 caracteres rechazado, `orden` de los 4 y uno inválido, `pagina` 0/negativa/no numérica rechazada, `min`/`max` negativos o decimales rechazados, `min > max` rechazado, objeto paginado válido. *(Verifica RF-1 … RF-5)*
  - `catalogQuery.test.ts`: roundtrip parse/build con valores válidos, inválidos que caen a defectos, omisión de defectos en la URL, `SORT_OPTIONS` con las 4 etiquetas en español. *(Verifica RF-6, RF-7)*
- **Backend (supertest + `mongodb-memory-server`):**
  - `q=taza` encuentra "Taza DCC", `q=TAZA` también, `q=taz` también, `q=(taza)+` no falla y busca literal, `q` con tilde y sin tilde equivalen. *(Verifica RF-1)*
  - Los 4 órdenes con desempate correcto y `orden=raro` → `400`. *(Verifica RF-2)*
  - `min`/`max` acotan, combinados con `q`+`categoria` (AND), `min > max` → `400`, negativos → `400`. *(Verifica RF-3)*
  - 10 productos → `total: 10`, `totalPaginas: 2`, página 2 con 1 producto; `pagina=999` devuelve la última; `pagina=0` → `400`; sin claves nuevas la respuesta sigue siendo arreglo. *(Verifica RF-4)*
- **Presentación (smoke tests, §4):**
  - `CatalogPage.test.tsx`: escribir en el buscador pide con debounce y reinicia a página 1; cambiar orden/precio/categoría repide; `aria-current="page"` en la activa; `role="status"` con el total; vacío con "Limpiar filtros" que restaura; URL con parámetros inválidos cae a defectos.
- **Verificación de contrato por QA (manual):**
  - Buscar "taza" → resultados, URL con `?q=taza`, recargar mantiene, compartir el enlace en otra pestaña muestra lo mismo.
  - Cambiar orden/precio/categoría → página 1 y URL actualizada sin entradas extra en el historial; atrás/adelante navega entre vistas.
  - Ir a página 2, recargar → página 2; `?pagina=999` → última página.
  - Sin red → "No se pudieron cargar los productos." con "Reintentar"; 360 px sin scroll horizontal; todo por teclado.
- **Ausencia de red / mocking:** los tests de rutas usan `mongodb-memory-server`; los de frontend simulan `fetch` (como `productApi.test.ts`).
- **Comando de cierre:** `npm run check` de raíz (`tsc --noEmit` + Vitest en los tres workspaces) en verde.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF que cubre |
|---|---|
| `q` con regex escapado + collation en `listProductPage` | RF-1 |
| Mapa de 4 órdenes con desempate en `listProductPage` + índice de precio | RF-2 |
| `min`/`max` en el filtro Mongo (AND) | RF-3 |
| Conteo + `skip`/`limit` + objeto con totales; arreglo simple sin claves nuevas | RF-4 |
| Query extendida + `productPageSchema` en `@tiendadcc/utils` | RF-5 |
| `catalogQuery.ts`, `useCatalogPage.ts`, `fetchCatalogPage`, buscador/orden/precios/paginación/estados en `CatalogPage` | RF-6 |
| Parseo/construcción de URL con `replace: true`, defectos omitidos e inválidos ignorados | RF-7 |
| Tests de esquemas, rutas y presentación | Verificación RF-1 a RF-7 (§4) |

---
*Nota:* La spec no deja dudas abiertas salvo las marcadas como revisables (tamaño 9, debounce 300 ms, objeto con totales). El plan asume esos valores. El siguiente paso según el flujo es generar `specs/009-product-search/tasks.md`.
