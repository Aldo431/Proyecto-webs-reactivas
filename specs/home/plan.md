# Plan home — Página de inicio "IDE institucional"

Plan de implementación para la spec `home` (`specs/home/spec.md`, en adelante **Home**), que es la **fase 1** del sistema de diseño (`specs/00-design-system/spec.md`, en adelante **DS**, RF-11). Respeta la constitución (§1–§6) y AGENTS.md, y cubre Home RF-1 a RF-10 y los requisitos de DS que la fase 1 activa. Cada sección indica qué RF atiende. Todas las rutas son relativas a `apps/frontend/client/`, salvo que se indique otra cosa.

Datos verificados el 2026-10-03 contra npm y los registros:
- **Versiones:** `shadcn` 4.21.1, `motion` 14.0.0 (publicada el 2026-10-02) y 12.43.0, `radix-ui` 1.6.7, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `lucide-react` 1.51.0, `@fontsource-variable/*` 5.3.0. Node local: 22.18.0 (shadcn exige ≥ 20.18.1).
- **Registros:** `@magicui` (`https://magicui.design/r/{name}`) y `@react-bits` (`https://reactbits.dev/r/{name}.json`) están en el índice oficial de shadcn.
- **Código de los componentes** (fuente descargada y revisada):
  - Los cinco traen `"use client"` y ninguno importa `next/*`.
  - `border-beam` usa `repeat: Infinity`.
  - `TypingAnimation` (dentro de `terminal.tsx`) y `DecryptedText` animan con `setInterval`, no con Motion.
  - `DecryptedText` pone en su `sr-only` el texto **mientras se cifra**.
  - `terminal.tsx` ya exporta `Terminal`, `TypingAnimation` y `AnimatedSpan`.
- **Fuentes:** los paquetes `@fontsource-variable/*` exportan `"."` con tipos (`index.d.css.ts`) y declaran las familias `"Inter Variable"` y `"JetBrains Mono Variable"`.

## 1. Estructura de módulos
*Cubre: Home RF-1…RF-10; DS RF-1…RF-12 (fase 1).*

### 1.1 Archivos a crear

| Ruta | Tipo | Contenido | Cubre |
|---|---|---|---|
| `components.json` | Config | Configuración de la CLI de shadcn (ver §3.3) | DS RF-11 |
| `src/lib/utils.ts` | Terceros (copiado) | `cn()` con `clsx` + `tailwind-merge`, con cabecera de origen | DS RNF-6, RF-11 |
| `src/components/ui/button.tsx` | Terceros (CLI) | Primitiva `Button`, ajustada: variante `brand`, `destructive` con `text-destructive-foreground` | DS RF-2, RF-9 |
| `src/components/ui/card.tsx` | Terceros (CLI) | Primitiva `Card` | DS RF-9 |
| `src/components/ui/badge.tsx` | Terceros (CLI) | Primitiva `Badge` | DS RF-9 |
| `src/components/magicui/terminal.tsx` | Terceros (CLI) | `Terminal` + `TypingAnimation`, ajustados para movimiento reducido | DS RF-10; Home RF-2 |
| `src/components/magicui/blur-fade.tsx` | Terceros (CLI) | `BlurFade`, ajustado para movimiento reducido | DS RF-10; Home RF-2, RF-4 |
| `src/components/magicui/border-beam.tsx` | Terceros (CLI) | `BorderBeam`, ajustado: una pasada y fundido final | DS RF-10; Home RF-2 |
| `src/components/reactbits/DecryptedText.tsx` | Terceros (CLI) | `DecryptedText`, ajustado para movimiento reducido | DS RF-10; Home RF-2 |
| `src/logic/motionTokens.ts` (+ `.test.ts`) | Lógica pura | Duraciones 150/250/400 ms, conversión a segundos, curva estándar | DS RF-6 |
| `src/logic/heroTimeline.ts` (+ `.test.ts`) | Lógica pura | Línea de tiempo del hero y velocidad de escritura derivada | Home RF-2, RF-10 |
| `src/logic/categoryParam.ts` (+ `.test.ts`) | Lógica pura | `toCategorySlug`, `parseCategoryParam` (Zod), `catalogPathForCategory`, `CATEGORY_SHORTCUTS` | Home RF-6 |
| `src/logic/productRepository.ts` (+ `.test.ts`) | Acceso a datos | `createFeaturedProductsSource`, `fetchFeaturedProducts` | Home RF-7 |
| `src/logic/useFeaturedProducts.ts` (+ `.test.ts`) | Hook | Estado `loading` / `error` / `success` + `retry` | Home RF-5, RF-7 |
| `src/components/SkipLink.tsx` | Presentación | "Saltar al contenido" (enfoca `main` sin tocar el hash) | Home RNF-4 |
| `src/components/ComingSoonItem.tsx` | Presentación | Acceso deshabilitado "próximamente" | Home RF-1, RF-9 |
| `src/components/HomeHero.tsx` | Presentación | `h1` con `DecryptedText`, descripción, terminal decorativa y accesos | Home RF-2, RF-3 |
| `src/components/FeaturedProducts.tsx` (+ `.test.tsx`) | Presentación | Sección "Destacados", con estados y entrada escalonada | Home RF-4, RF-5 |
| `src/components/CategoryShortcuts.tsx` | Presentación | Sección "Categorías" con estética de flags | Home RF-6 |
| `src/components/SiteFooter.tsx` | Presentación | Footer con proyecto, DCC, curso, año y páginas "próximamente" | Home RF-9 |
| `src/pages/HomePage.test.tsx` | Test de render | Movimiento reducido, "próximamente", enlaces del footer y salto al contenido | Home RNF-7 |
| `src/pages/CatalogPage.test.tsx` | Test de render | `?categoria` y sincronización con `replace` | Home RF-6 |
| `src/thirdPartyCode.test.ts` | Test de guarda | Prohíbe `next/*`, `"use client"`, `next-themes` e imports no permitidos en el código de terceros | DS RF-10, RF-12 |

### 1.2 Archivos a modificar

| Ruta | Cambio | Cubre |
|---|---|---|
| `package.json`, `package-lock.json` | Dependencias de DS RNF-6 (ver §3.1) | DS RNF-6 |
| `tsconfig.json` | `compilerOptions.paths`: `"@/*": ["./src/*"]` | DS RNF-7 |
| `vite.config.ts` | `resolve.alias`: `"@": "/src"` (rutas relativas a la raíz de Vite; sin `node:path`) | DS RNF-7 |
| `index.html` | `<html lang="es" class="dark">` y `<meta name="color-scheme" content="dark">` | DS RF-4 |
| `src/styles.css` | Paleta base, tokens semánticos y propios, fuentes, duraciones, variante `dark`, capa base y regla de movimiento reducido (ver §3.4) | DS RF-1…RF-6, RF-8 |
| `src/main.tsx` | `import "@fontsource-variable/jetbrains-mono"` e `import "@fontsource-variable/inter"` | DS RF-5 |
| `src/App.tsx` | Envolver la app en `<MotionConfig reducedMotion="user">` | DS RF-8 |
| `src/setupTests.ts` | Simulaciones de `matchMedia` (configurable por test), `IntersectionObserver` y `ResizeObserver` | DS RNF-8; Home RNF-7 |
| `src/logic/productParse.ts` (+ `.test.ts`) | Campo `featured: z.boolean()`; tests nuevos sin tocar los existentes | Home RF-8 |
| `src/logic/productLookup.ts` (+ `.test.ts`) | `getFeaturedProducts` → `selectFeaturedProducts` (por `featured`, con tope) | Home RF-7, RF-8 |
| `src/logic/productFilter.test.ts` | Datos de prueba con `featured` | Home RF-8 |
| `src/data/products.json` | `"featured": true` en los tres productos | Home RF-8 |
| `src/components/Header.tsx` | Logo como `Link` con `>_` decorativo, enlace "Catálogo" y tres `ComingSoonItem`. "Volver" sigue siendo botón (no hay enmienda sobre él) | Home RF-1 |
| `src/components/AuthBar.tsx` | "Registrarse ahora" e "Iniciar sesión" como `Button asChild` + `Link` | Home RF-3 |
| `src/components/ProductCard.tsx` | `Link` que envuelve `Card`, con categoría en `Badge` y tokens | Home RF-4; DS RF-9 |
| `src/components/ProductGrid.test.tsx` | Datos de prueba con `featured` | Home RF-8 |
| `src/pages/HomePage.tsx` | Composición: `SkipLink`, `Header`, `main` (`HomeHero`, `FeaturedProducts`, `CategoryShortcuts`) y `SiteFooter` | Home RF-1…RF-9 |
| `src/pages/CatalogPage.tsx` | Filtro derivado de `useSearchParams` y `setSearchParams(..., { replace: true })` | Home RF-6 |
| `src/App.test.tsx` | `button` → `link` en los accesos convertidos y `findBy*` para los destacados, sin eliminar aserciones | Home, "Enmiendas" |

`ProductGrid.tsx` no cambia: el catálogo lo sigue usando, y su rediseño es la fase 2 (DS RF-11). La sección de destacados arma su propia grilla con `ProductCard` (D12).

### 1.3 Separación por capas (§3)
- **Presentación** (`pages/`, `components/`): solo marcado, tokens y estado de UI. No conoce el origen de los datos.
- **Lógica pura** (`logic/`): tokens de movimiento, línea de tiempo del hero, slugs y validación de `categoria`, selección de destacados, esquema Zod y el hook de estado. Tienen tests (§4).
- **Acceso a datos** (`logic/productRepository.ts`): único punto que sabe de dónde vienen los destacados (Home RF-7).
- **Datos** (`data/products.json`): validados con Zod al cargarse (AGENTS.md).
- **Terceros** (`components/ui/`, `components/magicui/`, `components/reactbits/`, `lib/utils.ts`): cada archivo lleva una cabecera con origen, URL, fecha y cambios (DS RF-11).

## 2. Modelo de datos y contrato de acceso
*Cubre: Home RF-5, RF-7, RF-8.*

```json
{
  "products": [
    {
      "id": "taza-dcc",
      "name": "Taza DCC",
      "category": "Tazas",
      "image": "/images/taza-dcc.png",
      "description": "Taza de cerámica con el logo del DCC.",
      "featured": true
    }
  ]
}
```

(Los tres productos llevan `"featured": true`. El esquema `productSchema` suma `featured: z.boolean()`, obligatorio. Se mantiene en `logic/productParse.ts` porque el traslado a `utils/` está bloqueado: Home, dudas abiertas. No hay red ni persistencia: DS RNF-2, §5.)

**Contrato de acceso a datos** (`logic/productRepository.ts`), Home RF-7:

```ts
export type FeaturedProductsSource = () => Promise<Product[]>;

// Fabrica un origen de destacados a partir de un cargador de JSON crudo.
export function createFeaturedProductsSource(
  loadRaw: () => Promise<unknown>,
): FeaturedProductsSource;
// = async () => selectFeaturedProducts(parseProducts(await loadRaw()), FEATURED_PRODUCT_COUNT)

// Hoy: datos empaquetados.
export const fetchFeaturedProducts: FeaturedProductsSource =
  createFeaturedProductsSource(() => Promise.resolve(productsJson));
```

- **Resuelve** con hasta `FEATURED_PRODUCT_COUNT` (3) productos con `featured: true`, en el orden de origen.
- **Rechaza** si el cargador rechaza o si los datos no pasan `productListSchema`. Eso activa el estado de error (Home RF-5).
- **Cambio a la API (futuro):** basta con sustituir el cargador. La respuesta tiene la misma forma `{ products: Product[] }` y se valida con el mismo esquema; `useFeaturedProducts` y la página no cambian:
  ```ts
  createFeaturedProductsSource(async () => {
    const response = await fetch("/api/products?featured=true");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
  ```
  El filtro y el tope se aplican igual en el cliente, así que es inofensivo aunque la API ya filtre.

**Hook** (`logic/useFeaturedProducts.ts`), Home RF-5 y RF-7:

```ts
type FeaturedProductsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; products: Product[] };

export function useFeaturedProducts(
  source: FeaturedProductsSource = fetchFeaturedProducts,
): { state: FeaturedProductsState; retry: () => void };
```

- **Inyección:** `source` es un parámetro para que los tests sustituyan el origen.
- **Una carga a la vez:** `retry` se ignora mientras hay una carga en curso (Home, casos límite).
- **Resultados obsoletos:** se descartan al desmontar el componente o cuando una carga nueva reemplaza a otra (con `StrictMode` los efectos se ejecutan dos veces en desarrollo).

## 3. Instalación y configuración
*Cubre: DS RF-1…RF-6, RF-9…RF-12, RNF-6, RNF-7.*

### 3.1 Comandos (en `apps/frontend/client/`)

```bash
# 0. Línea base de tamaño del bundle (DS RNF-5; ver R6)
npm run build

# 1. Dependencias npm aprobadas (DS RNF-6). motion queda fijado a ^12 (D3)
npm install motion@^12.23.12 \
  @fontsource-variable/jetbrains-mono@^5.3.0 @fontsource-variable/inter@^5.3.0 \
  clsx@^2.1.1 tailwind-merge@^3.7.0 class-variance-authority@^0.7.1 \
  radix-ui@^1.6.7 lucide-react@^1.51.0

# 2. Después de escribir a mano components.json, src/lib/utils.ts y el alias (D1, D2):
#    primero vista previa y luego instalación, componente por componente.
npx shadcn@4.21.1 add button card badge --dry-run
npx shadcn@4.21.1 add button card badge

npx shadcn@4.21.1 add @magicui/terminal @magicui/blur-fade @magicui/border-beam -p src/components/magicui --dry-run
npx shadcn@4.21.1 add @magicui/terminal @magicui/blur-fade @magicui/border-beam -p src/components/magicui

npx shadcn@4.21.1 add @react-bits/DecryptedText-TS-TW -p src/components/reactbits --dry-run
npx shadcn@4.21.1 add @react-bits/DecryptedText-TS-TW -p src/components/reactbits

# 3. Revisión obligatoria tras cada add (R2)
git diff -- package.json src/styles.css

# 4. Cierre
npm run check
npm run build
```

- **Versión fija de la CLI:** `shadcn@4.21.1` se usa con `npx` y no se instala (DS RNF-6).
- **Sin `shadcn init`:** no se ejecuta (D1).
- **`typing-animation` no se instala:** `terminal.tsx` ya exporta `TypingAnimation` (D4).

### 3.2 Alias `@/` (DS RNF-7)
- `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }` (sin `baseUrl`; TS 5 resuelve `paths` relativo al `tsconfig`).
- `vite.config.ts`: `resolve: { alias: { "@": "/src" } }`. Vite resuelve `/src` desde su raíz y Vitest hereda la configuración. Si Vitest no lo resolviera, la alternativa sin dependencias es `new URL("./src", import.meta.url).pathname` (R7).

### 3.3 `components.json` (DS RF-11)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils",
    "hooks": "@/logic"
  },
  "registries": {
    "@magicui": "https://magicui.design/r/{name}",
    "@react-bits": "https://reactbits.dev/r/{name}.json"
  }
}
```

(El alias `hooks` apunta a `@/logic` porque no existe `hooks/`: DS RF-11.)

### 3.4 `src/styles.css` (DS RF-1…RF-6, RF-8)
El archivo se organiza en este orden:
1. `@import "tailwindcss";` y `@custom-variant dark (&:where(.dark, .dark *));`, para que `dark:` aplique siempre con `<html class="dark">` (DS RF-4).
2. `@theme`:
   - la paleta base de DS RF-1 (`--color-dcc-*`, `--color-ink-*`, `--color-amber-400`, `--color-green-500`);
   - `--font-mono` y `--font-sans` (DS RF-5);
   - `--duration-fast/base/slow` y `--ease-standard` (DS RF-6);
   - `--radius`.
   
   Las escalas `brand-*` y `accent-*` actuales **se conservan** hasta la fase 4, porque catálogo, detalle y formularios aún las usan (DS RF-1).
3. `:root`:
   - `color-scheme: dark`;
   - las variables semánticas de shadcn (`--background` … `--ring`, `--destructive`, `--destructive-foreground`) y las propias (`--brand-blue`, `--brand-red`, `--terminal-prompt`, `--terminal-success` y sus `-foreground`), que apuntan a la paleta base (DS RF-2, RF-3).
4. `@theme inline`: `--color-background: var(--background)`, etc., para exponer las clases (`bg-background`, `text-terminal-prompt`, …).
5. `@layer base`:
   - `body` con `bg-background text-foreground font-sans`;
   - `h1, h2, h3` con `font-mono` (DS RF-5).
6. `@media (prefers-reduced-motion: reduce)`: anula `animation` y limita `transition-duration` a ≤ 150 ms en todos los elementos (DS RF-8).

### 3.5 Fuentes (DS RF-5)
`main.tsx` importa `@fontsource-variable/jetbrains-mono` e `@fontsource-variable/inter`.
- **Tipos:** los paquetes exportan `"."` con declaración de tipos, compatible con `noUncheckedSideEffectImports`.
- **Empaquetado:** Vite incluye los `.woff2` en el build y el navegador descarga solo los subconjuntos usados (`unicode-range`). No hay CDN (DS RNF-2).

## 4. Decisiones técnicas justificadas
*Cubre: transversal (se indica en cada decisión).*

**D1 — `components.json` y `lib/utils.ts` escritos a mano, sin `shadcn init`.**
- Justificación: `init` reescribe `styles.css` con sus propios tokens (choca con DS RF-1–RF-3) y agrega `tw-animate-css`, que DS RNF-6 excluye. En la versión 4 también puede agregar el paquete `shadcn` (para `shadcn/tailwind.css`) y generar `export { cn } from "cn"`, que DS RNF-6 manda reemplazar. Escribir ambos archivos a mano deja el control en la spec. *(DS RF-11, RNF-6)*
- Alternativa descartada: **`npx shadcn init`**. Obliga a revertir sus cambios en CSS y dependencias después de cada ejecución.

**D2 — Alias `"@": "/src"` en Vite, sin `node:path`.**
- Justificación: la CLI exige `@/` (DS RNF-7). Usar `path.resolve` requeriría `@types/node`, una dependencia no aprobada (DS RNF-6), y `vite.config.ts` está incluido en `tsc`. *(DS RNF-6, RNF-7)*
- Alternativa descartada: **`path.resolve(__dirname, "src")` + `@types/node`**. Agrega una dependencia fuera de la lista aprobada.

**D3 — Fijar `motion@^12.23.12`.**
- Justificación: React Bits declara `motion@^12.23.12` y Magic UI no fija versión. La 14.0.0 se publicó el 2026-10-02 y no está validada con estos componentes. Fijar la 12 satisface ambos registros. *(DS RNF-6, RF-10)*
- Alternativa descartada: **`motion@latest` (14)**. Es una versión mayor de un día de antigüedad, con riesgo de incompatibilidad en los componentes copiados.

**D4 — Instalar solo lo que usa la fase 1.**
- Justificación:
  - Primitivas: `button`, `card` y `badge`. `input` y `label` llegan en la fase 4, y `toggle` y `toggle-group` en la fase 2 (DS RF-11).
  - Componentes: `terminal` (que ya incluye `TypingAnimation`), `blur-fade`, `border-beam` y `DecryptedText`.
  - La lista de DS RF-10 es un máximo permitido, no una obligación. *(DS RF-9, RF-10, RF-11)*
- Alternativa descartada: **instalar las siete primitivas y `typing-animation`**. Agrega código sin uso y duplica `TypingAnimation`.

**D5 — Movimiento reducido en dos capas: `MotionConfig` global y guardas por componente.**
- Justificación: `MotionConfig reducedMotion="user"` cubre transformaciones y layout, pero no:
  - el desenfoque y la opacidad de `blur-fade`;
  - los `setInterval` de `TypingAnimation` y `DecryptedText`;
  - el bucle de `border-beam`.
  
  Por eso cada uno se ajusta con `useReducedMotion()` de `motion/react` para renderizar el estado final, o no renderizarse en el caso de `border-beam`. Cada ajuste se registra en la cabecera del archivo. *(DS RF-8, RF-10; Home RF-2, RF-4)*
- Alternativa descartada: **solo `MotionConfig`**. La escritura, el cifrado y el haz seguirían animándose, en contra de DS RF-8.

**D6 — `h1` accesible separado del efecto, y terminal oculta.**
- Justificación: `DecryptedText` expone en su `sr-only` el texto mientras se cifra. Para que el nombre accesible sea siempre "TiendaDCC", el `h1` lleva un `<span class="sr-only">TiendaDCC</span>` y el efecto va dentro de un `<span aria-hidden="true">`. La terminal completa va en un contenedor con `aria-hidden="true"`. *(Home RF-2; DS RF-10)*
- Alternativa descartada: **confiar en el `sr-only` interno de `DecryptedText`**. Un lector de pantalla podría anunciar caracteres aleatorios.

**D7 — Origen de datos fabricado a partir de un cargador, y hook con origen inyectable.**
- Justificación: Home RF-7 exige poder cambiar `products.json` por la API sin tocar la página. Con `createFeaturedProductsSource(loadRaw)` el cambio se reduce al cargador, y el mismo esquema Zod valida ambos orígenes (AGENTS.md). Inyectar `source` en el hook permite probar los tres estados de Home RF-5 sin red. *(Home RF-5, RF-7)*
- Alternativa descartada: **importar el JSON dentro del componente o hacer `fetch` en un `useEffect` de la página**. Mezcla datos con presentación (§3) e impide probar los estados.

**D8 — `selectFeaturedProducts` reemplaza a `getFeaturedProducts`.**
- Justificación: Home RF-8 define los destacados por `featured`, con el mismo tope de 3. Es una función pura testeable que reutilizan los dos orígenes (local y API). *(Home RF-7, RF-8)*
- Alternativa descartada: **mantener "los N primeros"**. Contradice la enmienda aprobada y el contrato de `?featured=true`.

**D9 — La URL es la única fuente de verdad del filtro del catálogo.**
- Justificación: el filtro activo se deriva en cada render de `parseCategoryParam(searchParams.get("categoria"), categories)`, y al elegir uno se llama a `setSearchParams(..., { replace: true })`. Al elegir "Todas" se elimina `categoria`. Así no hay un estado paralelo que se desincronice, la recarga conserva el filtro y "atrás" sale del catálogo. *(Home RF-6)*
- Alternativa descartada: **`useState` sincronizado con la URL mediante un efecto**. Son dos fuentes de verdad, con un render intermedio inconsistente.

**D10 — Accesos "próximamente" como `<button type="button" aria-disabled="true">`.**
- Justificación: un botón es focable y su estado se anuncia, mientras que `disabled` lo saca del orden de tabulación (Home RF-1). Un `<a>` sin `href` no es focable ni tiene rol. El clic no hace nada y el nombre accesible incluye "(próximamente)". *(Home RF-1, RF-9)*
- Alternativa descartada: **`<button disabled>` o `<a>` sin `href`**. No se pueden descubrir con teclado.

**D11 — "Saltar al contenido" enfoca `main` por script, sin ancla.**
- Justificación: con `HashRouter`, `href="#contenido"` cambiaría la ruta (`#/…`) y llevaría a la ruta comodín. El enlace evita la acción por defecto y llama a `focus()` sobre `<main tabIndex={-1}>`. *(Home RNF-4; DS RF-12)*
- Alternativa descartada: **ancla `href="#main"`**. Rompe la navegación con `HashRouter`.

**D12 — Grilla propia de destacados con `ProductCard` y `BlurFade`; `ProductGrid` no cambia.**
- Justificación: los destacados necesitan entrada escalonada y estados, y `ProductGrid` (con su `h2` "Productos") lo sigue usando el catálogo hasta la fase 2. Tocarlo ahora mezclaría fases. *(Home RF-4; DS RF-11)*
- Alternativa descartada: **agregar props de animación y estados a `ProductGrid`**. Acopla el catálogo a la fase 1.

**D13 — Duraciones duplicadas en CSS y TypeScript, con un test que compara ambas.**
- Justificación: Motion necesita números y el CSS necesita variables. `motionTokens.test.ts` importa `../styles.css?raw` y verifica que contiene `--duration-fast: 150ms`, `--duration-base: 250ms` y `--duration-slow: 400ms`, para que no se desincronicen. *(DS RF-6)*
- Alternativa descartada: **leer las variables CSS en tiempo de ejecución con `getComputedStyle`**. Es frágil en jsdom y agrega trabajo en cada render.

**D14 — Test de guarda del código de terceros en lugar de lint.**
- Justificación: no se agrega ESLint (DS RNF-9). `thirdPartyCode.test.ts` lee con `import.meta.glob(..., { query: "?raw", eager: true })` los archivos de `components/ui`, `components/magicui`, `components/reactbits` y `lib/`, y falla si encuentra:
  - `next/`, `next-themes` o `"use client"`;
  - imports fuera de `react`, `motion/react`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` y `@/lib/utils`;
  - archivos sin cabecera de origen.
  
  *(DS RF-10, RF-11, RF-12)*
- Alternativa descartada: **ESLint con reglas de imports restringidos**. Está fuera de alcance (DS RNF-9; Home, fuera de alcance).

**D15 — Línea de tiempo del hero como dato puro que alimenta las props de los componentes.**
- Justificación: `buildHeroTimeline(command, outputLines)` devuelve, para cada paso, inicio, fin, duración y retardo, más la velocidad de escritura (`charIntervalMs = floor(900 / command.length)`). `HomeHero` pasa esos valores a `delay` y `duration` de `TypingAnimation` y `BlurFade`, a `speed` y `maxIterations` de `DecryptedText` (50 ms × 12 = 600 ms) y al `transition` de `BorderBeam` (1,8 s, `repeat: 0`). La terminal usa `sequence={false}` para que manden los retardos explícitos. *(Home RF-2, RF-10)*
- Alternativa descartada: **valores escritos a mano en el JSX**. No se pueden testear contra el límite de 2 s ni recalcular si cambia el texto.

## 5. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterios de finalización de Home 1–16.*

- **Lógica pura obligatoria (§4):**
  - `motionTokens`: `DURATION_MS` = `{ fast: 150, base: 250, slow: 400 }`; `toSeconds(250)` → `0.25`; `EASE_STANDARD` = `[0.2, 0, 0, 1]`; `styles.css?raw` contiene las tres variables (D13). *(DS RF-6)*
  - `heroTimeline`:
    - el fin del último paso es < 2000 ms;
    - la escritura de `./tiendadcc --start` (19 caracteres) termina antes de 1100 ms, con `charIntervalMs` = 47;
    - "Hola, mundo." empieza al terminar la escritura y "Compila tu estilo…" al terminar la anterior;
    - con un comando de 90 caracteres, la escritura sigue terminando antes de 1100 ms;
    - el título termina antes de 700 ms y el haz antes de 1800 ms.
    
    *(Home RF-10)*
  - `categoryParam`:
    - `toCategorySlug`: `"Tazas"` → `"tazas"`; `"Accesorios Técnicos"` → `"accesorios-tecnicos"`.
    - `parseCategoryParam`: `"tazas"` con `["Tazas","Poleras","Stickers"]` → `"Tazas"`; `null`, `""`, `"TAZAS"`, `"tazas "`, `"tazas%20"`, `"gorros"` y `"<script>"` → `null`.
    - `catalogPathForCategory("Poleras")` → `"/catalogo?categoria=poleras"`.
    - `CATEGORY_SHORTCUTS` = `["Tazas","Poleras","Stickers"]`.
    
    *(Home RF-6)*
  - `productParse`: los tests existentes se mantienen sin cambios. Se agregan dos: rechaza un producto sin `featured` y rechaza `featured: "sí"`. *(Home RF-8)*
  - `productLookup`:
    - `selectFeaturedProducts` filtra por `featured`, conserva el orden, aplica el tope de 3, devuelve `[]` con tope 0 y `[]` si ninguno es destacado;
    - `getProductById` se mantiene, con datos de prueba que incluyen `featured`.
    
    *(Home RF-7, RF-8)*
  - `productRepository`:
    - `fetchFeaturedProducts()` resuelve los 3 productos empaquetados;
    - con un cargador que devuelve un producto sin `featured`, rechaza;
    - con un cargador que rechaza, rechaza;
    - con 5 destacados, devuelve 3.
    
    *(Home RF-7)*
  - `useFeaturedProducts` (`renderHook`):
    - pasa de `loading` a `success`, y de `loading` a `error`;
    - `retry` vuelve a `loading` y luego a `success`;
    - `retry` durante una carga no vuelve a invocar el origen;
    - desmontar antes de que resuelva no actualiza el estado.
    
    *(Home RF-5, RF-7)*
- **Render (obligatorios por Home RNF-7):**
  - `FeaturedProducts.test.tsx`, con origen inyectado:
    - carga: "Cargando productos destacados…" en `role="status"`, sin tarjetas;
    - error: "No pudimos cargar los productos destacados." en `role="alert"`, ícono oculto, botón "Reintentar" y clase `text-destructive`;
    - vacío: "Aún no hay productos destacados." y enlace "Ver catálogo completo" a `/catalogo`;
    - éxito: 3 enlaces a `/producto/<id>`.
    
    *(Home RF-4, RF-5)*
  - `HomePage.test.tsx`:
    - con `matchMedia` simulando `reduce`: las tres líneas de la terminal y el texto "TiendaDCC" están en el DOM desde el primer render, y no se renderiza `border-beam` (DS RF-8; Home RF-2);
    - activar "Carrito (próximamente)" no cambia la ubicación;
    - el enlace del DCC tiene `target="_blank"` y `rel="noopener noreferrer"`;
    - "Saltar al contenido" enfoca `main` sin cambiar la ubicación.
    
    *(Home RF-1, RF-9, RNF-4)*
  - `CatalogPage.test.tsx`, con `MemoryRouter` y una sonda de ubicación:
    - `?categoria=tazas` deja "Tazas" con `aria-pressed="true"`;
    - `?categoria=gorros` deja "Todas" presionado y muestra 3 tarjetas;
    - elegir "Tazas" deja `?categoria=tazas` y elegir "Todas" deja la búsqueda vacía;
    - con entradas `["/", "/catalogo"]`, tras cambiar de filtro, `navigate(-1)` vuelve a `/`.
    
    *(Home RF-6)*
  - `App.test.tsx`: los accesos convertidos se buscan con rol `link` y las aserciones existentes se conservan. Las búsquedas de "Taza DCC", "Polera DCC" y "Sticker DCC" en el inicio pasan a `findByText`. *(Home, "Enmiendas")*
  - `thirdPartyCode.test.ts` (D14). *(DS RF-10–RF-12)*
- **Verificación de contrato por QA (manual):**
  - contraste con las herramientas del navegador sobre los pares de DS RF-2 y RF-3;
  - anchos de 360, 768 y 1280 px sin desplazamiento horizontal (Home RNF-3);
  - recorrido completo con teclado y foco visible (Home RNF-4);
  - emulación de `prefers-reduced-motion` (DS RF-8);
  - temporización del hero en el panel de rendimiento, que debe terminar antes de 2 s (Home RF-10);
  - modo sin conexión y tema del sistema operativo en modo claro (DS RF-4);
  - tamaño del bundle comparado con la línea base (R6).
- **Ausencia de red / mocking:** no hay llamadas de red. El origen de datos se inyecta en los tests, y `setupTests.ts` simula `matchMedia`, `IntersectionObserver` y `ResizeObserver`.
- **Comando de cierre:** `npm run check` (`tsc --noEmit && vitest run`) debe pasar al final de cada tarea. `npm run build` se ejecuta además para medir el bundle (el "build" atribuido a `check` es un pendiente documental conocido).

## 6. Riesgos y mitigación
*Cubre: DS RF-10, RF-12, RNF-5, RNF-6, RNF-9.*

| # | Riesgo | Mitigación | Cita |
|---|---|---|---|
| R1 | **Código de Next.js en los componentes copiados.** Los cinco traen `"use client"`; futuros componentes podrían traer `next/image`, `next/link` o `next-themes`. | Se eliminan `"use client"` al incorporarlos. Se ejecuta `--dry-run` antes de cada `add`. `thirdPartyCode.test.ts` rompe `npm run check` si aparecen `next/`, `next-themes` o `"use client"` (D14). | DS RF-12 |
| R2 | **La CLI agrega dependencias o CSS no aprobados** (`cn`, `tw-animate-css`, `shadcn`, `@import "shadcn/tailwind.css"`, variables CSS de registro). | Se usa `--dry-run` y, después de cada `add`, `git diff -- package.json src/styles.css`. Lo no aprobado se revierte (`npm uninstall`, se borra la línea) y los imports `from "cn"` se cambian a `@/lib/utils`. | DS RNF-6 |
| R3 | **Código copiado que no compila** con `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals` o `verbatimModuleSyntax` (p. ej. el indexado de caracteres en `DecryptedText`). Sin ESLint, `tsc` es la única barrera. | Se ajusta el archivo copiado y el cambio se anota en su cabecera; nunca se relaja el `tsconfig` ni se excluyen archivos. `thirdPartyCode.test.ts` complementa a `tsc` con reglas de imports (D14). | DS RF-12, RNF-9 |
| R4 | **Animaciones que ignoran el movimiento reducido** (`setInterval` de `TypingAnimation` y `DecryptedText`, desenfoque de `blur-fade`, `repeat: Infinity` de `border-beam`). | Guardas con `useReducedMotion()` en cada componente (D5); `border-beam` con `repeat: 0` y fundido final; test de render con `reduce` (§5). | DS RF-7, RF-8 |
| R5 | **Nombre accesible del `h1` cifrado** por el `sr-only` interno de `DecryptedText`. | `h1` con texto `sr-only` propio y efecto oculto (D6); test `getByRole("heading", { name: "TiendaDCC" })`. | Home RF-2 |
| R6 | **Tamaño del bundle.** Motion completo pesa decenas de KB comprimidos; además se suman Radix, cva, clsx, tailwind-merge, lucide y fuentes. | Se mide la línea base (`npm run build`) antes de instalar nada. Presupuesto: **+60 KB gzip de JS** como máximo sobre la línea base al cerrar la fase 1. Los íconos se importan uno por uno (`import { ShoppingCart } from "lucide-react"`) y las fuentes cargan solo los subconjuntos usados. Si se supera el presupuesto, se revisan los imports antes de seguir. | DS RNF-5 |
| R7 | **El alias `"@": "/src"` no resuelve en Vitest.** | `npm run check` lo detecta en cuanto un test importe código de terceros. Alternativa sin dependencias: `new URL("./src", import.meta.url).pathname` (D2). | DS RNF-7 |
| R8 | **`motion` 14 instalado por arrastre** al ejecutar `add` de Magic UI (que no fija versión). | Se instala `motion@^12.23.12` antes de cualquier `add` (D3) y se verifica con `npm ls motion` que haya una sola versión 12. | DS RNF-6 |
| R9 | **jsdom sin `IntersectionObserver` ni `matchMedia`:** `BlurFade`, `Terminal` y `DecryptedText` (con `startOnView` o `animateOn="view"`) fallarían en los tests. | Simulaciones en `setupTests.ts`; `matchMedia` configurable por test para probar `reduce`. | DS RNF-8 |
| R10 | **Navegación por hash rota** por anclas internas o `<a href="/…">`. | Salto al contenido por `focus()` (D11); toda la navegación interna con `Link` o `useNavigate`; el test de guarda y la revisión buscan `href="/` y `href="#`. | DS RF-12 |
| R11 | **El estilo `new-york` no es aceptado por la CLI 4.x.** | El `--dry-run` lo revela. Si ocurre, se usa el estilo equivalente que indique la CLI, conservando los tokens de DS (los colores no dependen del estilo). | DS RF-9 |
| R12 | **Destello claro en desarrollo**, donde Vite inyecta el CSS por JS. | `<meta name="color-scheme" content="dark">` y `class="dark"` en `index.html`; en producción el CSS va en `<link>` dentro de `<head>`. | DS RF-4 |

## 7. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF |
|---|---|
| `Header` + `ComingSoonItem` | Home RF-1 |
| `HomeHero` + `DecryptedText` + `terminal` + `border-beam` + `heroTimeline` | Home RF-2, RF-10; DS RF-7, RF-8 |
| `AuthBar` y accesos con `Button asChild` + `Link` | Home RF-3; DS RF-9, RF-12 |
| `FeaturedProducts` + `ProductCard` (`Card`, `Badge`) + `BlurFade` escalonado | Home RF-4 |
| Estados de `FeaturedProducts` + `useFeaturedProducts` | Home RF-5 |
| `CategoryShortcuts` + `categoryParam` + `CatalogPage` sincronizado | Home RF-6 |
| `productRepository` (`createFeaturedProductsSource`, `fetchFeaturedProducts`) | Home RF-7 |
| `productParse` (`featured`) + `selectFeaturedProducts` + `products.json` | Home RF-8 |
| `SiteFooter` | Home RF-9 |
| `SkipLink`, landmarks, foco y responsive | Home RNF-3, RNF-4 |
| `styles.css`, `index.html`, `main.tsx` y `App.tsx` (`MotionConfig`) | DS RF-1…RF-6, RF-8 |
| `components.json`, alias, dependencias, `lib/utils.ts` y carpetas de terceros | DS RF-9…RF-11, RNF-6, RNF-7 |
| `thirdPartyCode.test.ts` y limpieza de `"use client"` | DS RF-10, RF-12 |
| Tests de lógica pura y de render | verificación Home RF-1…RF-10 y DS fase 1 (§4) |

---

Nota: quedan dos pendientes de la spec que el plan no resuelve.
- El traslado del esquema Zod a `utils/` sigue bloqueado. El plan lo mantiene en `logic/productParse.ts`.
- El nombre del curso en el footer ("CC5003 — Aplicaciones Web Reactivas") es un supuesto; corregirlo solo cambia un texto de `SiteFooter`.

El plan asume los valores más conservadores: `motion` 12, solo las primitivas de la fase 1, sin `shadcn init` y con un presupuesto de bundle explícito. El siguiente paso es ejecutar las tareas de `tasks.md` corriendo `npm run check` al cierre de cada una.
