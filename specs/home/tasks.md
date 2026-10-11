# Tasks home — Página de inicio "IDE institucional"

Tareas atómicas (≈20–30 min c/u), en orden de dependencia, derivadas de `specs/home/plan.md`. Cada tarea indica:
- descripción;
- archivos que toca (máximo 4, relativos a `apps/frontend/client/` salvo que se indique otra cosa);
- criterio de la spec que cumple (**Home** = `specs/home/spec.md`, **DS** = `specs/00-design-system/spec.md`);
- verificación ("Hecho cuando");
- dependencias.

Marco de cierre global: `npm run check` en verde al terminar **cada** tarea (AGENTS.md).

> **Tarea no creada: traslado del esquema Zod a `utils/`.** Estaba prevista como tarea propia antes de agregar `featured`, pero está bloqueada: el frontend aún no puede importar desde `utils/` (sin workspace, sin alias y `zod` no resoluble desde la raíz). El esquema se mantiene en `logic/productParse.ts` y el traslado queda como pendiente en `spec.md` (dudas abiertas).

## Fase 0 — Setup de infraestructura

- [x] **T01 — Medir la línea base del bundle**
    Descripción: ejecutar `npm run build` antes de instalar nada y anotar el tamaño gzip de JS y CSS en la sección "Registro de mediciones" de este archivo.
    Archivos: `specs/home/tasks.md` (raíz del repo).
    Cumple: DS RNF-5; plan R6.
    Hecho cuando: el registro tiene los tamaños gzip de JS y CSS de la línea base, copiados de la salida de `vite build`.
    Depende de: —

- [x] **T02 — Instalar las dependencias npm aprobadas**
    Descripción: ejecutar el `npm install` de plan §3.1 (`motion@^12.23.12`, fuentes, `clsx`, `tailwind-merge`, `class-variance-authority`, `radix-ui`, `lucide-react`).
    Archivos: `package.json`, `package-lock.json`.
    Cumple: DS RNF-6; plan D3.
    Hecho cuando: `package.json` agrega exactamente esos 8 paquetes y ningún otro; `npm ls motion` muestra una sola versión 12.x; pasa `npm run check`.
    Depende de: T01

- [x] **T03 — Configurar el alias `@/`**
    Descripción: agregar `"paths": { "@/*": ["./src/*"] }` en `tsconfig.json` y `resolve.alias: { "@": "/src" }` en `vite.config.ts`, sin `node:path`.
    Archivos: `tsconfig.json`, `vite.config.ts`.
    Cumple: DS RNF-7; plan D2.
    Hecho cuando: pasan `npm run check` y `npm run build`. Si Vitest no resuelve el alias, se aplica la alternativa de plan R7 y se anota.
    Depende de: T02

- [x] **T04 — Crear `components.json` y `lib/utils.ts`**
    Descripción: escribir a mano `components.json` (plan §3.3) y `src/lib/utils.ts` con `cn()` (`clsx` + `tailwind-merge`) y su cabecera de origen. No se ejecuta `shadcn init`.
    Archivos: `components.json`, `src/lib/utils.ts`.
    Cumple: DS RF-11, RNF-6; plan D1.
    Hecho cuando: `npx shadcn@4.21.1 info` lee la configuración sin errores; `utils.ts` tiene cabecera con origen, URL, fecha y cambios; no existe el paquete `cn` en `package.json`; pasa `npm run check`.
    Depende de: T03

- [x] **T05 — Simular APIs del navegador en los tests**
    Descripción: agregar a `setupTests.ts` simulaciones de `IntersectionObserver` y `ResizeObserver`, y de `matchMedia` configurable por test (por defecto, sin `reduce`).
    Archivos: `src/setupTests.ts`.
    Cumple: DS RNF-8; Home RNF-7; plan R9.
    Hecho cuando: los tests existentes siguen pasando con el mismo número de casos; existe un helper exportado para activar `prefers-reduced-motion: reduce` en un test; pasa `npm run check`.
    Depende de: —

## Fase 1 — Tokens y tipografía

- [x] **T06 — Tema oscuro base y paleta**
    Descripción:
    - En `index.html`: `<html lang="es" class="dark">` y `<meta name="color-scheme" content="dark">`.
    - En `styles.css`: `@custom-variant dark`, la paleta base de DS RF-1 en `@theme` (conservando `brand-*` y `accent-*`) y `color-scheme: dark` en `:root`.
    Archivos: `index.html`, `src/styles.css`.
    Cumple: DS RF-1, RF-4; plan R12.
    Hecho cuando: el `@theme` declara exactamente los 14 tokens base con sus valores; con el sistema operativo en modo claro la página se ve oscura y sin destello claro (QA); pasa `npm run check`.
    Depende de: —

- [x] **T07 — Tokens semánticos de shadcn y tokens propios**
    Descripción: definir en `:root` las variables semánticas de DS RF-2 (incluido `destructive-foreground`) y las propias de DS RF-3, exponerlas con `@theme inline` y aplicar `bg-background text-foreground` al `body` en `@layer base`.
    Archivos: `src/styles.css`.
    Cumple: DS RF-2, RF-3.
    Hecho cuando: clases como `bg-background`, `text-muted-foreground`, `bg-brand-red` y `text-terminal-prompt` se generan en `npm run build`; cada par de las tablas de DS RF-2 y RF-3 coincide en valores (los ratios ya están calculados en DS); pasa `npm run check`.
    Depende de: T06

- [x] **T08 — Tipografía local**
    Descripción: importar `@fontsource-variable/jetbrains-mono` e `@fontsource-variable/inter` en `main.tsx`, definir `--font-mono` y `--font-sans` en `@theme` y aplicar `font-sans` al `body` y `font-mono` a `h1`–`h3` en `@layer base`.
    Archivos: `src/main.tsx`, `src/styles.css`.
    Cumple: DS RF-5.
    Hecho cuando: `npm run build` incluye los `.woff2` de ambas familias en `dist/assets`; con la red desactivada las fuentes cargan (QA); pasa `npm run check` (incluido `noUncheckedSideEffectImports`).
    Depende de: T07

- [x] **T09 — Tokens de movimiento y regla de movimiento reducido**
    Descripción:
    - Crear `motionTokens.ts` (`DURATION_MS`, `toSeconds` y `EASE_STANDARD`) con sus tests.
    - Agregar a `styles.css` `--duration-*`, `--ease-standard` y la regla `@media (prefers-reduced-motion: reduce)`.
    Archivos: `src/logic/motionTokens.ts`, `src/logic/motionTokens.test.ts`, `src/styles.css`.
    Cumple: DS RF-6, RF-8; plan D13.
    Hecho cuando: los tests verifican 150/250/400, `toSeconds(250) === 0.25`, `EASE_STANDARD` y que `styles.css?raw` contiene las tres variables; pasa `npm run check`.
    Depende de: T08

- [x] **T10 — `MotionConfig` global**
    Descripción: envolver el contenido de `App` en `<MotionConfig reducedMotion="user">`.
    Archivos: `src/App.tsx`.
    Cumple: DS RF-8; plan D5.
    Hecho cuando: `App.test.tsx` pasa sin cambios; pasa `npm run check`.
    Depende de: T02

## Fase 2 — Lógica y tests

- [x] **T11 — Fábrica de productos de prueba**
    Descripción: crear `productFixtures.ts` con `makeProduct(overrides)` y migrar a ella los datos de prueba con tipo `Product`, sin cambiar ninguna aserción. Así, agregar `featured` solo tocará la fábrica.
    Archivos: `src/logic/productFixtures.ts`, `src/logic/productFilter.test.ts`, `src/logic/productLookup.test.ts`, `src/components/ProductGrid.test.tsx`.
    Cumple: Home RF-8 (preparación); Home RNF-7.
    Hecho cuando: los tres archivos de test tienen el mismo número de casos y aserciones que antes y pasan; pasa `npm run check`.
    Depende de: —

- [x] **T12 — Campo `featured` en el modelo**
    Descripción: agregar `featured: z.boolean()` a `productSchema`, `"featured": true` a los tres productos de `products.json` y `featured: true` por defecto en `makeProduct`. Agregar dos tests nuevos sin tocar los existentes.
    Archivos: `src/logic/productParse.ts`, `src/logic/productParse.test.ts`, `src/data/products.json`, `src/logic/productFixtures.ts`.
    Cumple: Home RF-8.
    Hecho cuando: los tests existentes de `productParse` pasan sin modificaciones; los nuevos verifican que se rechaza un producto sin `featured` y uno con `featured: "sí"`; pasa `npm run check`.
    Depende de: T11

- [x] **T13 — `selectFeaturedProducts`**
    Descripción: reemplazar `getFeaturedProducts` por `selectFeaturedProducts(products, count)` (filtra por `featured`, conserva el orden y aplica el tope), actualizar sus tests y el import de `HomePage`.
    Archivos: `src/logic/productLookup.ts`, `src/logic/productLookup.test.ts`, `src/pages/HomePage.tsx`.
    Cumple: Home RF-7, RF-8; plan D8.
    Hecho cuando: los tests cubren filtro, orden, tope de 3, tope 0 → `[]` y ningún destacado → `[]`; `App.test.tsx` sigue pasando; pasa `npm run check`.
    Depende de: T12

- [x] **T14 — Acceso a datos de destacados**
    Descripción: crear `createFeaturedProductsSource(loadRaw)` y `fetchFeaturedProducts` según el contrato de plan §2.
    Archivos: `src/logic/productRepository.ts`, `src/logic/productRepository.test.ts`.
    Cumple: Home RF-7; plan D7.
    Hecho cuando: los tests verifican:
    - resuelve los 3 productos empaquetados;
    - rechaza con un cargador que devuelve datos sin `featured`;
    - rechaza con un cargador que rechaza;
    - con 5 destacados devuelve 3;
    - no hay ningún `fetch`.

    Pasa `npm run check`.
    Depende de: T13

- [x] **T15 — Hook `useFeaturedProducts`**
    Descripción: hook con estado discriminado (`loading` | `error` | `success`), `retry`, origen inyectable, una sola carga en curso y descarte de resultados obsoletos.
    Archivos: `src/logic/useFeaturedProducts.ts`, `src/logic/useFeaturedProducts.test.ts`.
    Cumple: Home RF-5, RF-7; plan §2.
    Hecho cuando: los tests (`renderHook`) verifican:
    - `loading` → `success` y `loading` → `error`;
    - `retry` → `loading` → `success`;
    - `retry` durante una carga no vuelve a invocar el origen;
    - desmontar antes de resolver no actualiza el estado.

    Pasa `npm run check`.
    Depende de: T14

- [x] **T16 — Validación del parámetro `categoria`**
    Descripción: crear `toCategorySlug`, `parseCategoryParam` (esquema Zod de slug + comparación con las categorías existentes), `catalogPathForCategory` y `CATEGORY_SHORTCUTS`.
    Archivos: `src/logic/categoryParam.ts`, `src/logic/categoryParam.test.ts`.
    Cumple: Home RF-6.
    Hecho cuando: los tests cubren los casos de plan §5:
    - `"tazas"` → `"Tazas"`;
    - `null`, `""`, `"TAZAS"`, `"tazas "`, `"tazas%20"`, `"gorros"` y `"<script>"` → `null`;
    - el slug con tildes;
    - la ruta `/catalogo?categoria=poleras`.

    Pasa `npm run check`.
    Depende de: —

- [x] **T17 — Línea de tiempo del hero**
    Descripción: crear `buildHeroTimeline(command, outputLines)` con los pasos de Home RF-10 y la velocidad de escritura derivada, usando `motionTokens`.
    Archivos: `src/logic/heroTimeline.ts`, `src/logic/heroTimeline.test.ts`.
    Cumple: Home RF-2, RF-10; plan D15.
    Hecho cuando: los tests verifican:
    - el fin es < 2000 ms;
    - la escritura termina antes de 1100 ms, con `charIntervalMs` = 47 para `./tiendadcc --start`;
    - las líneas de salida son consecutivas;
    - un comando de 90 caracteres sigue cabiendo;
    - el título termina antes de 700 ms y el haz antes de 1800 ms.

    Pasa `npm run check`.
    Depende de: T09

- [x] **T18 — Test de guarda del código de terceros**
    Descripción: crear un test que lea con `import.meta.glob(?raw)` los archivos de `components/ui`, `components/magicui`, `components/reactbits` y `lib/`, y falle si encuentra:
    - `next/`, `next-themes` o `"use client"`;
    - imports fuera de la lista de plan D14;
    - un archivo sin cabecera de origen.
    Archivos: `src/thirdPartyCode.test.ts`.
    Cumple: DS RF-10, RF-11, RF-12; plan D14, R1, R3.
    Hecho cuando: el test pasa con `lib/utils.ts` y falla si se le agrega temporalmente `"use client"` (comprobación manual, revertida); pasa `npm run check`.
    Depende de: T04

## Fase 3 — Componentes base

- [x] **T19 — Primitivas `button`, `card` y `badge`**
    Descripción:
    - Ejecutar `npx shadcn@4.21.1 add button card badge`, primero con `--dry-run`.
    - Ajustar `button.tsx`: variante `brand` (`bg-brand-red text-brand-red-foreground`) y `destructive` con `text-destructive-foreground`.
    - Eliminar `"use client"`, cambiar los imports `from "cn"` a `@/lib/utils` y agregar las cabeceras de origen.
    Archivos: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`.
    Cumple: DS RF-2, RF-9, RNF-6; plan D1, D4, R2, R11.
    Hecho cuando: `git diff -- package.json src/styles.css` no muestra cambios de la CLI (o se revirtieron); `Button` ofrece las variantes de DS RF-9; pasan el test de guarda y `npm run check`.
    Depende de: T07, T18

- [x] **T20 — `terminal` y `blur-fade` (Magic UI)**
    Descripción:
    - Ejecutar `npx shadcn@4.21.1 add @magicui/terminal @magicui/blur-fade -p src/components/magicui`, primero con `--dry-run`.
    - Ajustar con `useReducedMotion()`: `TypingAnimation` muestra el texto completo sin cursor parpadeante, y `BlurFade` renderiza su estado final sin desenfoque ni desplazamiento.
    - Eliminar `"use client"` y agregar las cabeceras de origen con los cambios.
    Archivos: `src/components/magicui/terminal.tsx`, `src/components/magicui/blur-fade.tsx`.
    Cumple: DS RF-8, RF-10, RF-12; plan D5, R1, R4, R8.
    Hecho cuando: `npm ls motion` sigue mostrando una sola versión 12.x; `package.json` no cambia; pasan el test de guarda y `npm run check`.
    Depende de: T19, T10, T05

- [x] **T21 — `border-beam` (Magic UI)**
    Descripción:
    - Ejecutar `npx shadcn@4.21.1 add @magicui/border-beam -p src/components/magicui`, primero con `--dry-run`.
    - Ajustar: una sola pasada (`repeat: 0`) con fundido al final, `aria-hidden="true"`, y `null` con movimiento reducido.
    - Eliminar `"use client"` y agregar la cabecera.
    Archivos: `src/components/magicui/border-beam.tsx`.
    Cumple: DS RF-8, RF-10; Home RF-2, RF-10; plan R4.
    Hecho cuando: el archivo no contiene `Infinity`; pasan el test de guarda y `npm run check`.
    Depende de: T20

- [x] **T22 — `DecryptedText` (React Bits)**
    Descripción:
    - Ejecutar `npx shadcn@4.21.1 add @react-bits/DecryptedText-TS-TW -p src/components/reactbits`, primero con `--dry-run`, y dejar el archivo en `src/components/reactbits/DecryptedText.tsx`.
    - Ajustar: con movimiento reducido, renderiza el texto final sin intervalos.
    - Corregir errores de `tsc` estricto (indexado de caracteres), eliminar `"use client"` y agregar la cabecera.
    Archivos: `src/components/reactbits/DecryptedText.tsx`.
    Cumple: DS RF-8, RF-10; Home RF-2; plan R3, R5.
    Hecho cuando: no hay `setInterval` activo con `reduce` (revisión de código); pasan el test de guarda y `npm run check`.
    Depende de: T20

- [x] **T23 — `ComingSoonItem` y `SkipLink`**
    Descripción:
    - `ComingSoonItem`: `<button type="button" aria-disabled="true">` con ícono opcional, marca visible "próximamente" y nombre accesible "<Nombre> (próximamente)"; el clic no hace nada.
    - `SkipLink`: "Saltar al contenido", que enfoca un elemento por referencia sin cambiar el hash.
    Archivos: `src/components/ComingSoonItem.tsx`, `src/components/SkipLink.tsx`.
    Cumple: Home RF-1, RF-9, RNF-4; plan D10, D11.
    Hecho cuando: ambos tipan sus props explícitamente y usan solo tokens; pasa `npm run check` (los tests de comportamiento están en T30 y T32).
    Depende de: T19

- [x] **T24 — `ProductCard` con `Card` y `Badge`**
    Descripción: rehacer `ProductCard` como un `Link` que envuelve `Card`, con la categoría en `Badge` (`font-mono`), la descripción en `font-sans` y solo tokens, conservando el enlace y el texto alternativo.
    Archivos: `src/components/ProductCard.tsx`.
    Cumple: Home RF-4; DS RF-1, RF-9; 002 RF-1.
    Hecho cuando: `ProductGrid.test.tsx` y `App.test.tsx` pasan sin cambios; el archivo no contiene `slate-*`, `brand-*` ni hex; pasa `npm run check`.
    Depende de: T19

## Fase 4 — Secciones de Home

- [x] **T25 — Barra superior**
    Descripción: en `Header`:
    - logo como `Link` a `/` con `>_` decorativo (`aria-hidden`);
    - enlace "Catálogo";
    - `ComingSoonItem` para "Favoritos", "Carrito" y "Perfil" con íconos de `lucide-react`.

    "Volver" sigue siendo botón. En `App.test.tsx`, la búsqueda del logo pasa de `button` a `link`, sin eliminar aserciones.
    Archivos: `src/components/Header.tsx`, `src/App.test.tsx`.
    Cumple: Home RF-1; Home, "Enmiendas" (001 RF-7).
    Hecho cuando: `App.test.tsx` pasa con las mismas aserciones; el logo tiene nombre accesible "TiendaDCC" y `href` a la raíz; pasa `npm run check`.
    Depende de: T23

- [x] **T26 — Hero de terminal y accesos principales**
    Descripción:
    - Crear `HomeHero`:
      - `h1` con `sr-only` "TiendaDCC" + `DecryptedText` dentro de `aria-hidden`;
      - descripción "Venta de productos del DCC.";
      - terminal `aria-hidden="true"` con `sequence={false}`, `$` en `text-terminal-prompt`, `./tiendadcc --start`, "Hola, mundo." y "Compila tu estilo: tazas, poleras y stickers.";
      - `BorderBeam`;
      - todas las temporizaciones tomadas de `buildHeroTimeline`.
    - Pasar `AuthBar` a `Button asChild` + `Link` ("Registrarse ahora" con la variante `brand`) y agregar "Ver Catálogo" como `Link`.
    - Usar `HomeHero` en `HomePage`.
    - Pasar a `link` las búsquedas correspondientes de `App.test.tsx`.
    Archivos: `src/components/HomeHero.tsx`, `src/components/AuthBar.tsx`, `src/pages/HomePage.tsx`, `src/App.test.tsx`.
    Cumple: Home RF-2, RF-3, RF-10; Home, "Enmiendas"; plan D6, D15.
    Hecho cuando: `App.test.tsx` pasa con las mismas aserciones (`getByRole("heading", { name: "TiendaDCC" })`, enlaces "Registrarse ahora", "Iniciar sesión" y "Ver Catálogo"); la terminal no tiene elementos focables; pasa `npm run check`.
    Depende de: T17, T20, T21, T22, T25

- [x] **T27 — Sección "Destacados" (éxito y entrada escalonada)**
    Descripción: crear `FeaturedProducts`:
    - recibe un `source` opcional y usa `useFeaturedProducts`;
    - muestra el `h2` "Destacados" y hasta 3 `ProductCard` con `BlurFade` (duración `base`, retardos `índice × fast`);
    - termina con el `Link` "Ver más productos".

    Usarla en `HomePage`. En `App.test.tsx`: `findByText` para los productos y `link` para "Ver más productos", sin eliminar aserciones.
    Archivos: `src/components/FeaturedProducts.tsx`, `src/components/FeaturedProducts.test.tsx`, `src/pages/HomePage.tsx`, `src/App.test.tsx`.
    Cumple: Home RF-4; DS RF-6, RF-7; plan D12.
    Hecho cuando: el test de éxito verifica 3 enlaces a `/producto/<id>`; un test verifica los retardos 0/0,15/0,30 s y la duración de 0,25 s pasados a `BlurFade`; `App.test.tsx` pasa con las mismas aserciones; pasa `npm run check`.
    Depende de: T15, T20, T24, T26

- [x] **T28 — Sección "Categorías"**
    Descripción: crear `CategoryShortcuts` con el `h2` "Categorías" y un `Link` por cada `CATEGORY_SHORTCUTS` hacia `catalogPathForCategory(...)`, con el fragmento `$ tiendadcc --categoria=<slug>` oculto (`aria-hidden`) y el nombre visible. Usarla en `HomePage` y crear `HomePage.test.tsx` con su test.
    Archivos: `src/components/CategoryShortcuts.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`.
    Cumple: Home RF-6 (accesos).
    Hecho cuando: el test verifica tres enlaces con nombre "Tazas", "Poleras" y "Stickers" y `href` `/catalogo?categoria=tazas|poleras|stickers`; pasa `npm run check`.
    Depende de: T16, T26

- [x] **T29 — Sincronizar el filtro del catálogo con el parámetro `categoria`**
    Descripción: en `CatalogPage`, derivar el filtro activo de `parseCategoryParam(searchParams.get("categoria"), categories)`. Al elegir una categoría, llamar a `setSearchParams` con su slug y `{ replace: true }`; al elegir "Todas", eliminar `categoria` (también con `replace: true`).
    Archivos: `src/pages/CatalogPage.tsx`, `src/pages/CatalogPage.test.tsx`.
    Cumple: Home RF-6 (sincronización con `setSearchParams` y `replace: true`; "Todas" elimina el parámetro); Home RNF-7; plan D9.
    Hecho cuando: los tests verifican:
    - `?categoria=tazas` → "Tazas" con `aria-pressed="true"`;
    - `?categoria=gorros` → "Todas" presionado y 3 tarjetas;
    - elegir "Tazas" → `?categoria=tazas`, y elegir "Todas" → sin parámetro;
    - con entradas `["/", "/catalogo"]`, tras varios cambios de filtro, `navigate(-1)` vuelve a `/`.

    Los tests del catálogo en `App.test.tsx` siguen pasando; la recarga conserva el filtro (QA); pasa `npm run check`.
    Depende de: T16, T28

- [x] **T30 — Footer**
    Descripción: crear `SiteFooter` con:
    - "TiendaDCC" (`font-mono`);
    - enlace "Departamento de Ciencias de la Computación (DCC)" a `https://www.dcc.uchile.cl`, con `target="_blank"`, `rel="noopener noreferrer"` y "(se abre en una pestaña nueva)" en `sr-only`;
    - "Proyecto del curso CC5003 — Aplicaciones Web Reactivas, 2026";
    - cuatro `ComingSoonItem` ("Sobre la tienda", "Envíos y retiro", "Preguntas frecuentes", "Contacto").

    Usarlo en `HomePage` y agregar tests en `HomePage.test.tsx`.
    Archivos: `src/components/SiteFooter.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`.
    Cumple: Home RF-9; plan D10.
    Hecho cuando: los tests verifican:
    - el landmark `contentinfo`;
    - los atributos `target` y `rel` del enlace;
    - la ausencia de `mailto:`;
    - que activar "Contacto (próximamente)" no cambia la ubicación.

    Pasa `npm run check`.
    Depende de: T23, T28

## Fase 5 — Estados

- [x] **T31 — Estados de carga, error y vacío de "Destacados"**
    Descripción: en `FeaturedProducts`, agregar:
    - carga: "Cargando productos destacados…" con `role="status"`;
    - error: "No pudimos cargar los productos destacados." con `role="alert"`, ícono de `lucide-react` oculto, tokens `text-destructive` y `border-destructive`, y `Button` "Reintentar" que llama a `retry`;
    - vacío: "Aún no hay productos destacados." y `Link` "Ver catálogo completo".

    "Ver más productos" queda visible en los tres estados.
    Archivos: `src/components/FeaturedProducts.tsx`, `src/components/FeaturedProducts.test.tsx`.
    Cumple: Home RF-5; DS RF-3.
    Hecho cuando: los tests, con un origen inyectado (pendiente, rechazado o vacío), verifican cada mensaje, su rol, la ausencia de tarjetas, la clase `text-destructive`, que no se usan `brand-red` ni `terminal-prompt`, y que "Reintentar" vuelve a la carga; pasa `npm run check`.
    Depende de: T27

## Fase 6 — Responsive y accesibilidad

- [x] **T32 — Landmarks y salto al contenido**
    Descripción: en `HomePage`, poner `SkipLink` como primer elemento focable y `<main tabIndex={-1}>` como destino, y verificar la jerarquía (un `h1`, un `h2` por sección) y los landmarks. Agregar en `HomePage.test.tsx` los tests del salto al contenido y de los "próximamente" de la barra superior.
    Archivos: `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`.
    Cumple: Home RF-1, RNF-4; plan D11, R10.
    Hecho cuando: los tests verifican:
    - el primer elemento focable es "Saltar al contenido" y al activarlo el foco queda en `main` sin cambiar la ubicación;
    - hay un solo `h1`;
    - existen los landmarks `banner`, `navigation`, `main` y `contentinfo`;
    - activar "Carrito (próximamente)" no navega.

    Pasa `npm run check`.
    Depende de: T30, T31

- [x] **T33 — Test de movimiento reducido**
    Descripción: en `HomePage.test.tsx`, con `matchMedia` simulando `reduce` (helper de T05), verificar el estado del primer render.
    Archivos: `src/pages/HomePage.test.tsx`.
    Cumple: DS RF-8, RNF-8; Home RF-2, RF-4.
    Hecho cuando: el test verifica que en el primer render:
    - están en el DOM `./tiendadcc --start`, "Hola, mundo." y "Compila tu estilo: tazas, poleras y stickers.";
    - el `h1` "TiendaDCC" está presente;
    - no se renderiza `BorderBeam`.

    Pasa `npm run check`.
    Depende de: T32

- [x] **T34 — Ajuste responsive**
    Descripción: ajustar las clases según Home RNF-3:
    - una columna en móvil;
    - destacados en 2 y 3 columnas en tablet y escritorio;
    - categorías en 3 columnas desde tablet;
    - terminal con envoltura de líneas;
    - en móvil, la barra superior muestra los "próximamente" como íconos con nombre accesible.
    Archivos: `src/components/HomeHero.tsx`, `src/components/FeaturedProducts.tsx`, `src/components/CategoryShortcuts.tsx`, `src/components/Header.tsx`.
    Cumple: Home RNF-3; DS RNF-3.
    Hecho cuando: en QA a 360, 768 y 1280 px no hay desplazamiento horizontal; las grillas tienen las columnas indicadas y la línea más larga de la terminal se envuelve; pasa `npm run check`.
    Depende de: T33

- [x] **T35 — Revisión de accesibilidad y contraste**
    Descripción: hacer QA manual. Si hay correcciones, se aplican en un máximo de 4 archivos de componentes de Home; si se necesitan más, se divide en tareas nuevas.
    Archivos: según los hallazgos (máximo 4).
    Cumple: Home RNF-4; DS RF-2, RF-3, RNF-4.
    Hecho cuando la revisión manual confirma:
    - el recorrido completo con teclado tiene un orden de foco igual al orden visual y foco visible con el token `ring`;
    - los pares de color usados coinciden con las tablas de DS;
    - las imágenes tienen texto alternativo;
    - los fragmentos de sintaxis están ocultos;
    - con el lector de pantalla del sistema, el hero anuncia el `h1`, la descripción y los accesos, pero no la terminal;
    - pasa `npm run check`.
    Depende de: T34

## Fase 7 — Cierre

- [x] **T36 — Medir el bundle contra la línea base**
    Descripción: ejecutar `npm run build` y anotar el tamaño gzip final y la diferencia con T01 en el registro de mediciones.
    Archivos: `specs/home/tasks.md` (raíz del repo).
    Cumple: DS RNF-5; plan R6.
    Hecho cuando: el aumento de JS gzip es ≤ 60 KB respecto de la línea base. Si se supera, se revisan los imports (íconos uno por uno, sin barriles) antes de dar la tarea por cerrada.
    Depende de: T35

- [x] **T37 — Cierre: `npm run check` en verde y criterios de finalización**
    Descripción: recorrer los criterios de finalización 1–16 de Home y los criterios de DS que aplican a la fase 1, y marcar esta lista.
    Archivos: `specs/home/tasks.md` (raíz del repo).
    Cumple: Home, criterios de finalización 1–16; Home RNF-7.
    Hecho cuando: `npm run check` (`tsc --noEmit && vitest run`) pasa sin errores, anoto el resultado en la respuesta final y cada criterio de Home queda verificado o con su tarea indicada.
    Depende de: T36

## Registro de mediciones

| Medición | JS gzip | CSS gzip | Fecha |
|---|---|---|---|
| Línea base (T01) | 109,37 KB (353,41 KB sin comprimir) | 3,95 KB (16,51 KB sin comprimir) | 2026-10-03 |
| Fin de fase 1, primera medición (T36) | 171,91 KB (544,36 KB sin comprimir); +62,54 KB, excede el presupuesto | 10,14 KB (40,70 KB sin comprimir) | 2026-10-04 |
| Fin de fase 1, con `LazyMotion` + `domAnimation` (T36) | 157,91 KB (496,77 KB sin comprimir) | 10,14 KB (40,70 KB sin comprimir) | 2026-10-04 |
| Diferencia final (T36 − T01) | +48,54 KB (presupuesto: +60 KB; dentro) | +6,19 KB (sin presupuesto) | 2026-10-04 |
