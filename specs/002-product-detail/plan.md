# Plan 002 — Página individual de producto (detalle por clic en ProductCard)

Plan de implementación para la spec `002-product-detail`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-5. Cada sección indica qué RF atiende. Mejora y reemplaza el borrador previo de este mismo archivo: adopta la estructura oficial (módulos, modelo, decisiones con alternativa, tests, cobertura) y precisa la migración del tipo `Route`, el helper de ruta y el estado de no-encontrado.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5.*

Organización dentro del frontend existente (`apps/frontend/client/`), separando lógica de interfaz (§3). No hay cambios de backend: sigue sin usarse (RNF-2).

- **Lógica pura testeable** — `logic/` *(RF-1, RF-3, RF-5)*
  - `routeParser`: `parseRoute(hash)` evoluciona de `type Route = "home" | "register" | "login" | "unknown"` (`routeParser.ts:1`) a unión discriminada que porta el id:
    ```ts
    type Route =
      | { name: "home" } | { name: "register" } | { name: "login" }
      | { name: "product"; productId: string } | { name: "unknown" };
    ```
    Reconoce `#/producto/:id` (decodifica el id una vez con `decodeURIComponent`); `#/producto`, `#/producto/` y `#/producto/a/b` devuelven `unknown`. Las rutas 001 se conservan intactas. *(RF-1, RF-5)*
  - `buildProductRoute(productId)`: helper puro que construye `#/producto/<id>` con `encodeURIComponent`. Vive junto al parser para que Card y tests compartan una sola definición de la ruta. *(RF-1)*
  - Nuevo `productLookup`: `getProductById(products, id): Product | undefined` con comparación exacta sensible a mayúsculas. *(RF-2, RF-3)*
  - `productParse`: se reutiliza sin cambios; sigue validando `products.json` con Zod (AGENTS.md). *(RF-2)*
- **Enrutamiento (hook propio)** — `hooks/` *(RF-1, RF-4, RF-5)*
  - `useHashRouter` (`useHashRouter.ts:8`) pasa a exponer el nuevo `Route` sin cambiar su contrato de suscripción a `hashchange`; `navigate(hash)` se reutiliza tal cual (ya evita duplicar la navegación si el hash no cambia). *(RF-1, RF-5)*
  - `App.tsx:6` discrimina por `route.name`: `product` renderiza el detalle con `productId`; el fallback actual (`unknown` → inicio) se conserva para no ampliar el alcance. *(RF-1, RF-5)*
  - Al entrar a un detalle se restaura el scroll al inicio (`window.scrollTo(0, 0)` en el montaje del detalle o en el cambio de ruta), porque el hash no lo hace solo. *(RF-2)*
- **Páginas (presentación pura)** — `pages/` *(RF-2, RF-3, RF-4)*
  - Nueva `ProductDetailPage({ productId }: { productId: string })`: obtiene el catálogo ya validado, resuelve con `getProductById` y renderiza dos estados excluyentes: detalle (imagen con `alt = name`, `h1` con el nombre, categoría, descripción) o no-encontrado ("Producto no encontrado" + "Volver al inicio"). Usa `Header` con `showBackButton={true}` y `backLabel="Volver al inicio"`. *(RF-2, RF-3, RF-4)*
  - `HomePage` (`HomePage.tsx:7`): sin cambios de datos; la navegación llega vía `ProductCard`. *(RF-1)*
- **Componentes compartidos** — `components/` *(RF-1, RF-4)*
  - `ProductCard` (`ProductCard.tsx:7`): el elemento externo pasa de `article` a enlace `<a href={buildProductRoute(product.id)}>` conservando clases y contenido (imagen, categoría, nombre, descripción). Firma de props intacta (`{ product: Product }`). El nombre accesible del enlace es el nombre del producto (contenido textual ya presente, sin `aria-label` extra). *(RF-1)*
  - `ProductGrid` (`ProductGrid.tsx:8`): sin cambios; delega el enlace a cada Card. *(RF-1)*
  - `Header` (`Header.tsx:7`): se reutiliza con una nueva prop opcional `backLabel` (por defecto `"Volver"`, sin alterar registro/login); en el detalle se pasa `"Volver al inicio"` y tanto ese botón como el logo navegan al inicio. La futura etiqueta "Volver a productos" queda fuera de alcance (aún no existe una vista de productos separada del inicio). *(RF-4)*
- **Datos de ejemplo** — `data/` *(RF-2)*
  - `products.json`: sin cambios en esta fase (ni claves ni valores). Se parsea con `parseProducts` en el detalle igual que en el inicio. *(RF-2)*

## 2. Modelo de datos JSON
*Cubre: RF-2.*

Sin cambios respecto a 001. Producto estático empaquetado en el bundle, sin persistencia ni llamadas de red (RNF-2, constitución §5). Claves en inglés; valores orientados al usuario en español (§6). Se valida con Zod al cargar (AGENTS.md).

```json
{
  "products": [
    {
      "id": "taza-dcc",
      "name": "Taza DCC",
      "category": "Tazas",
      "image": "/images/taza-dcc.png",
      "description": "Taza de cerámica con el logo del DCC."
    },
    {
      "id": "polera-dcc",
      "name": "Polera DCC",
      "category": "Poleras",
      "image": "/images/polera-dcc.png",
      "description": "Polera de algodón con estampado del DCC."
    },
    {
      "id": "sticker-dcc",
      "name": "Sticker DCC",
      "category": "Stickers",
      "image": "/images/sticker-dcc.png",
      "description": "Stickers con el logo del DCC."
    }
  ]
}
```

(El `image` sigue siendo ruta local: evita llamadas de red externas y preserva el funcionamiento sin conexión del caso límite. Añadir `price`/`stock` exigiría cambiar este formato y queda fuera de alcance: requiere actualizar la spec antes, según AGENTS.md.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Extender el hash routing propio a `#/producto/:id`, sin librería de rutas.**
- Justificación: RF-5 exige URL directa y recarga funcionando sin backend (RNF-2); el hash se sirve desde un único `index.html`, igual que `#/registro` en 001. Reutiliza `useHashRouter`/`navigate` (RNF-5, sin recarga) y encaja con §3 (parser puro y testeable). *(RF-1, RF-5)*
- Alternativa descartada: **React Router**. Estándar de la industria pero dependencia fuera del stack (§1, RNF-6); además sus rutas limpias exigen fallback de servidor en recarga, lo que contradice RNF-2.

**D2 — Migrar `Route` a unión discriminada con `productId`, en vez de parsear el id en el componente.**
- Justificación: RF-1 y RF-5 necesitan el id tipado en el punto de montaje (`App` decide qué página renderizar). Portar el id en el tipo evita parseos duplicados y errores de sincronía entre parser y vista, y mantiene §3 (la UI solo consume el valor). *(RF-1, RF-5)*
- Alternativa descartada: **mantener `Route` como string y extraer el id con otro parseo en `ProductDetailPage`**. Duplica la lógica de ruteo en la capa de presentación y permite estados inconsistentes (ruta dice una cosa, la página otra).

**D3 — `ProductCard` como enlace `<a>` nativo, no `div`/`article` con `onClick`.**
- Justificación: RF-1 exige activación por clic y por teclado (RNF-4); el enlace nativo da foco, Enter/Espacio, clic medio y "copiar dirección" gratis, con nombre accesible igual al producto. *(RF-1)*
- Alternativa descartada: **`onClick` en `article`/`div` con `role` manual**. Reimplementa lo que el navegador ya hace, suele olvidar foco/keyboard y rompe copiar-enlace; mayor riesgo frente a RNF-4.

**D4 — Búsqueda en memoria con `getProductById` sobre el JSON empaquetado, sin API.**
- Justificación: la spec sigue siendo solo frontend (RNF-2); el catálogo tiene 3 ítems y ya viaja en el bundle, así que el lookup O(n) es trivial y no hay nada que simular en tests. *(RF-2, RF-3)*
- Alternativa descartada: **endpoint de backend (Express/Mongoose)**. Es la vía correcta para el catálogo real futuro (§5), pero introduce red, persistencia y despliegue, todo fuera de alcance de esta spec.

**D5 — Estado de no-encontrado explícito en español, sin redirección silenciosa.**
- Justificación: RF-3 exige mensaje + regreso y prohíbe mostrar datos ajenos; redirigir al inicio ocultaría que la URL pedía un producto inexistente y rompería el criterio de F5 sobre id inválido (RF-5). *(RF-3, RF-5)*
- Alternativa descartada: **redirección automática al inicio ante id desconocido**. Enmascara el error, impide verificar RF-3 y confunde al compartir URLs rotas.

**D6 — Reutilizar `Header`/`products.json`/esquema Zod sin cambios de formato.**
- Justificación: RF-2 y RF-4 quedan cubiertos con los 5 campos y el Header actuales; no cambiar el JSON evita activar la regla de AGENTS.md (cambio de formato exige spec) y minimiza el diff. La spec fija los textos: "Producto no encontrado" + "Volver al inicio" (todo acceso proviene del inicio en esta fase; "Volver a productos" queda para una futura vista de productos). *(RF-2, RF-4)*
- Alternativa descartada: **añadir `price`/`stock`, un Header propio del detalle o un segundo botón de regreso en el cuerpo**. Amplía el alcance o duplica controles de navegación; una sola prop `backLabel` resuelve la etiqueta sin duplicar nada.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 7.*

- **Lógica pura obligatoria (§4):**
  - `parseRoute`: conserva casos 001 (`#/`, hash vacío, `#/registro`, `#/iniciar-sesion`, desconocido → `unknown`) y añade `#/producto/taza-dcc` → `{ name: "product", productId: "taza-dcc" }`; `#/producto`, `#/producto/`, `#/producto/a/b` → `unknown`; id codificado (`#/producto/taza%20dcc`) → `productId` decodificado; mayúsculas en el prefijo (`#/PRODUCTO/x`) → `unknown`. *(Verifica RF-1, RF-5)*
  - `buildProductRoute`: `taza-dcc` → `#/producto/taza-dcc`; codifica espacios y caracteres especiales; round-trip con `parseRoute`. *(Verifica RF-1)*
  - `getProductById`: encuentra cada id del catálogo; `undefined` con id inexistente, vacío y con distinta capitalización (`Taza-DCC`). *(Verifica RF-2, RF-3)*
  - `productParse`: sigue validando `products.json` y rechazando entradas malformadas (heredado de 001). *(Verifica RF-2)*
  - Nota: los tests 001 que asertan `Route` como string deberán migrarse a la unión discriminada como parte del cambio (D2).
- **Presentación (no requiere cobertura, §4):**
  - Smoke tests opcionales: Card renderiza un enlace con `href="#/producto/<id>"` y nombre accesible *(RF-1)*; Detail con id existente muestra imagen/`h1`/categoría/descripción *(RF-2)*; con id inexistente muestra "Producto no encontrado" + "Volver al inicio" *(RF-3)*.
- **Verificación de contrato por QA (manual):**
  - Clic y teclado (Enter) en cada tarjeta → su detalle sin recarga *(RF-1)*; "Volver al inicio" y logo → inicio *(RF-4)*; URL directa y F5 en id existente e inexistente *(RF-5)*; atrás/adelante del navegador *(RF-5)*; móvil (1 columna) y escritorio (2 columnas) *(RNF-3)*; navegación completa solo con teclado *(RNF-4)*.
- **Ausencia de red:** no hay llamadas de API que simular (RNF-2); no se requiere mocking.
- **Comando de cierre:** `npm run check` (tipos + tests) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF |
|---|---|
| `parseRoute` + `buildProductRoute` + `useHashRouter` + `App` | RF-1, RF-5 |
| `ProductCard` como enlace + `ProductGrid` sin cambios | RF-1 |
| `ProductDetailPage` (detalle) + `parseProducts` + Zod | RF-2 |
| `getProductById` + estado no-encontrado | RF-3 |
| `Header` reutilizado ("Volver al inicio" + logo) + scroll-to-top | RF-4, RF-2 |
| `products.json` sin cambios de formato | RF-2 |
| Tests de lógica pura | verificación RF-1…RF-5 (§4) |

---

Nota: las dudas de textos quedaron fijadas en la spec ("Producto no encontrado" + "Volver al inicio"; "Volver a productos" solo ante una futura vista de productos). Pendiente de alinear en `spec.md`: los criterios de RF-2, RF-3 y RF-4 aún dicen "Volver" en lugar de "Volver al inicio". El plan no introduce dependencias nuevas.
