# Plan 003 — Catálogo de productos con filtros por categoría

Plan de implementación para la spec `003-products-catalog`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-6. Cada sección indica qué RF atiende. Adopta `react-router-dom@^7` con `HashRouter` (excepción RNF-6): reemplaza el router propio en toda la app.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6.*

Organización dentro del frontend existente (`apps/frontend/client/`), separando lógica de interfaz (§3). No hay cambios de backend: sigue sin usarse (RNF-2).

- **Lógica pura testeable** — `logic/` *(RF-1, RF-2, RF-3, RF-6)*
  - Ruteo con `HashRouter`: se elimina el router propio (`logic/routeParser.ts`, `hooks/useHashRouter.ts`, constantes `ROUTE_*`, `navigate()`); `App.tsx` monta `<HashRouter><Routes>` con `/`, `/registro`, `/iniciar-sesion`, `/producto/:id` (el `:id` llega por `useParams()`, que ya decodifica) y `/catalogo`, más `path="*"` → inicio para conservar el fallback de `unknown`. Las URLs visibles no cambian (`#/catalogo`, `#/producto/:id`). *(RF-1, RF-6)*
  - `productPath(productId)`: helper puro que construye `/producto/<id>` para los `Link` de las tarjetas (reemplaza a `buildProductRoute`, que se elimina con el router propio). *(RF-1)*
  - Nuevo `productFilter`: `getCategories(products): string[]` (categorías únicas en orden de primera aparición) y `filterProductsByCategory(products, category: string | null): Product[]` (`null` = "Todas"; categoría desconocida = arreglo vacío). *(RF-2, RF-3, RF-4)*
  - `productLookup`: se extiende con `getFeaturedProducts(products, count): Product[]` (los `count` primeros) y la constante `FEATURED_PRODUCT_COUNT = 3` (duda resuelta de la spec). *(RF-1)*
  - `productParse`: se reutiliza sin cambios; sigue validando `products.json` con Zod (AGENTS.md). *(RF-2)*
- **Páginas (presentación pura)** — `pages/` *(RF-1, RF-2, RF-4, RF-5)*
  - Nueva `CatalogPage`: `Header` con `showBackButton={true}` y `backLabel="Volver al inicio"`, `h1` "Catálogo", `CategoryFilter` y `ProductGrid` con el resultado del filtro; si el resultado está vacío muestra "No hay productos en esta categoría.". El filtro activo vive en estado local de UI (`useState`, inicial "Todas"); no va en la URL, así que la recarga lo reinicia (RF-6). *(RF-2, RF-3, RF-4, RF-5)*
  - `HomePage`: el héroe suma el botón "Ver Catálogo"; la grilla pasa a mostrar solo `getFeaturedProducts(catalog, FEATURED_PRODUCT_COUNT)` seguida del botón "Ver más productos". Ambos navegan con `useNavigate()` a `/catalogo` (igual que `AuthBar`, que también migra sus dos botones). Sin cambios en el resto del héroe. *(RF-1)*
- **Componentes compartidos** — `components/` *(RF-2, RF-3)*
  - Nuevo `CategoryFilter({ categories, activeCategory, onSelectCategory })`: fila de botones ("Todas" primero + una por categoría) con `aria-pressed` en el activo; solo presentación, sin lógica de filtrado. *(RF-3)*
  - `ProductGrid` y `ProductCard`: misma presentación; el enlace pasa de `<a href>` a `<Link to={productPath(product.id)}>` (genera el mismo `#/producto/<id>` visible). RF-1 de 002 sigue valiendo en el catálogo. *(RF-2)*
  - `Header`: se reutiliza con `backLabel="Volver al inicio"` (prop existente de 002); su navegación interna migra a `useNavigate()` (`navigate("/")`) y el logo a `Link`, sin cambiar apariencia ni contrato. *(RF-5)*
- **Enrutamiento (montaje)** — `App.tsx` *(RF-6)*
  - `<Route path="/catalogo" element={<CatalogPage />} />` más `path="*"` → inicio (conserva el fallback de `unknown`). *(RF-6)*
- **Datos de ejemplo** — `data/` *(RF-2)*
  - `products.json`: sin cambios en esta fase (ni claves ni valores). Se parsea con `parseProducts` en el catálogo igual que en el inicio. *(RF-2)*

## 2. Modelo de datos JSON
*Cubre: RF-2.*

Sin cambios respecto a 001/002. Producto estático empaquetado en el bundle, sin persistencia ni llamadas de red (RNF-2, constitución §5). Claves en inglés; valores orientados al usuario en español (§6). Se valida con Zod al cargar (AGENTS.md). Sobre este mismo modelo se derivan las dos vistas nuevas, sin tocar el formato:

```ts
getCategories(products); // ["Tazas", "Poleras", "Stickers"] (orden de aparición)
filterProductsByCategory(products, null); // todos ("Todas")
filterProductsByCategory(products, "Tazas"); // solo tazas
getFeaturedProducts(products, 3); // los 3 primeros (inicio)
```

(El `image` sigue siendo ruta local: evita llamadas de red externas y preserva el funcionamiento sin conexión del caso límite. Una categoría nueva en el JSON genera su filtro sola, sin cambios de código.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — `react-router-dom@^7` con `HashRouter`, en vez del router propio.**
- Justificación: RF-6 exige URL directa y recarga sin backend (RNF-2): solo el hash cumple sin servidor, así que `HashRouter` (no `BrowserRouter`) con las mismas URLs visibles (`#/catalogo`). Elimina el código propio de matching y sus tests de hash, alinea con el Lab5 del curso (misma librería y versión mayor) y deja cubiertas futuras necesidades (rutas anidadas, guards). Excepción sancionada en RNF-6. *(RF-1, RF-6)*
- Alternativa descartada: **mantener la tabla `routeParsers` propia**. Funciona para 4 rutas planas, pero es código propio que mantener y diverge de lo enseñado en el curso; cada conveniencia futura (anidación, guards) habría que reinventarla. (Segunda descartada: **`BrowserRouter`**: exige fallback del servidor en recarga, imposible con RNF-2.)

**D2 — Filtros derivados de los datos con estado local (`useState`), no en la URL.**
- Justificación: RF-3 pide filtrado inmediato sin recarga (RNF-5); derivar las categorías de los datos cumple el criterio de "categoría nueva sin cambios de código", y el estado local es solo UI (§3). La recarga reinicia a "Todas" tal como fija la spec (RF-6). *(RF-3, RF-6)*
- Alternativa descartada: **filtros persistidos en la URL (`#/catalogo?categoria=...`)**. Exigiría parseo de query en el router y enlaces compartibles, ambos explícitamente fuera de alcance en la spec.

**D3 — Principales como los N primeros vía `getFeaturedProducts`, no flag en el JSON.**
- Justificación: la spec fija principales = primeros 3; una función pura con `count` es testeable (§3, §4) y evita cambiar el formato del JSON (regla de AGENTS.md). *(RF-1)*
- Alternativa descartada: **campo `featured` en `products.json`**. Cambia el formato del dato y obliga a actualizar spec, esquema Zod y tests de `productParse` para un catálogo de 3 ítems.

**D4 — Reutilizar `ProductGrid`/`ProductCard`/`Header` sin variantes de catálogo.**
- Justificación: RF-2 exige una tarjeta enlazada por producto, que ya existe y cumple 002 (enlace accesible, `alt`, jerarquía); duplicar componentes divergiría el diseño entre inicio, catálogo y detalle. *(RF-2, RF-5)*
- Alternativa descartada: **tarjeta propia del catálogo**. Duplica presentación y riesgo de divergencia sin ningún requisito que la justifique.

**D5 — Estado vacío explícito con filtros visibles, sin redirección ni sección oculta.**
- Justificación: RF-4 exige mensaje + filtros + regreso visibles y cero tarjetas; ocultar la sección o redirigir al inicio enmascararía el estado y rompería F5 sobre una categoría vacía. *(RF-4)*
- Alternativa descartada: **redirección a "Todas" ante categoría vacía**. Cambia el filtro que el usuario eligió y hace imposible verificar RF-4.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 8.*

- **Lógica pura obligatoria (§4):**
  - Ruteo: se eliminan los tests de hash (`routeParser.test.ts`); las rutas se verifican con `MemoryRouter` (`initialEntries={["/catalogo"]}` → catálogo; `["/producto/taza-dcc"]` → su detalle; `["/ruta-rara"]` → inicio por `path="*"`; clic en tarjeta → detalle sin recarga). *(Verifica RF-1, RF-5 de 002, RF-6)*
  - `productPath`: `"taza-dcc"` → `"/producto/taza-dcc"`. *(Verifica RF-1)*
  - `getCategories`: deduce `["Tazas", "Poleras", "Stickers"]` del `products.json`, sin duplicados y en orden de aparición; `[]` con catálogo vacío. *(Verifica RF-2, RF-3)*
  - `filterProductsByCategory`: `null` → todos; `"Tazas"` → solo tazas; categoría desconocida → `[]`. *(Verifica RF-3, RF-4)*
  - `getFeaturedProducts`: primeros N; N mayor que el catálogo → todos; N = 0 → `[]`. *(Verifica RF-1)*
  - `productParse`: sigue validando `products.json` (heredado). *(Verifica RF-2)*
- **Presentación (no requiere cobertura, §4):**
  - Smoke tests opcionales: catálogo renderiza título, filtros y una tarjeta enlazada por producto *(RF-2)*; activar una categoría filtra sin recarga y marca `aria-pressed` *(RF-3)*; categoría vacía muestra el mensaje sin tarjetas *(RF-4)*; inicio muestra "Ver Catálogo" y "Ver más productos" *(RF-1)*.
- **Verificación de contrato por QA (manual):**
  - Ambos accesos → catálogo sin recarga *(RF-1)*; filtros por cada categoría y vuelta a "Todas" *(RF-3)*; URL directa y F5 (reinicia a "Todas") *(RF-6)*; atrás/adelante entre inicio, catálogo y detalle *(RF-6)*; "Volver al inicio" y logo *(RF-5)*; tarjeta del catálogo → su detalle (002) *(RF-2)*; móvil (filtros envueltos, 1 columna) y escritorio *(RNF-3)*; recorrido completo solo con teclado *(RNF-4)*.
- **Ausencia de red:** no hay llamadas de API que simular (RNF-2); no se requiere mocking.
- **Comando de cierre:** `npm run check` (tipos + tests) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF |
|---|---|
| `HashRouter` + `Routes` en `App` (`*` → inicio) + `productPath` | RF-6, RF-1 |
| `HomePage` (héroe + destacados + 2 botones) + `getFeaturedProducts` | RF-1 |
| `CatalogPage` + `parseProducts` + Zod | RF-2 |
| `CategoryFilter` + `getCategories` + `filterProductsByCategory` | RF-3 |
| Estado vacío ("No hay productos…") | RF-4 |
| `Header` reutilizado (`useNavigate`, "Volver al inicio" + logo) | RF-5 |
| `ProductGrid/Card` reutilizados (`Link` al detalle) | RF-2 |
| Tests de lógica pura | verificación RF-1…RF-6 (§4) |

---

Nota: todas las dudas de la spec quedaron resueltas (ruta, principales, filtros locales, `aria-pressed`, sin contadores, similares fuera, `HashRouter`). El plan introduce `react-router-dom@^7` (excepción RNF-6, misma versión mayor que el Lab5) y elimina el router propio; "Productos similares" queda como futura mejora del detalle habilitada por este catálogo. La migración `HashRouter` → `BrowserRouter` queda anotada como futura (cambia URLs públicas, exige backend con fallback).
