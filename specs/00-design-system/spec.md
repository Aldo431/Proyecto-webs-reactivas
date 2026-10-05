# Spec 00 — Sistema de diseño "IDE institucional"

> **Aclaración: por qué el id `00`.** Esta spec no es una funcionalidad más en la secuencia 001→003, sino la **base transversal** de la interfaz: AGENTS.md exige leer `specs/00-design-system/spec.md` antes de tocar UI. Por eso precede numéricamente a las demás y aplica a todas las specs de UI, existentes y futuras.

## Contexto y objetivo
Las specs 001, 002 y 003 dejaron una tienda **solo frontend** (inicio, registro, inicio de sesión, detalle y catálogo). Su estilo vive disperso en clases utilitarias de Tailwind v4 escritas a mano en cada componente, con una paleta `brand` (azul) y `accent` (rojo) en el `@theme` de `styles.css`. No hay tokens semánticos, tipografía propia, primitivas de UI reutilizables, reglas de movimiento ni criterios comunes de contraste y foco.

TiendaDCC no es una tienda genérica: debe sentirse **hecha por y para informáticos**. La dirección visual es la de un **IDE institucional**: estética de terminal/editor, sobria y legible, con el azul y el rojo del DCC, y con guiños de programación (prompts de shell, sintaxis de código, cursores, glitch sutil) sin caer en la parodia.

Esta spec define:
- los principios visuales;
- los tokens de color de un **único tema oscuro** y su mapeo a shadcn/ui;
- la tipografía local;
- los principios de animación;
- las dependencias aprobadas;
- la lista cerrada de componentes animados de terceros;
- dónde vive el código de terceros;
- las restricciones técnicas;
- el orden en que se adopta en las vistas, empezando por el inicio.

Ninguna librería es obligatoria por el curso: esta spec sanciona las que se usan y fija sus condiciones. Los requisitos funcionales de 001–003 siguen vigentes, incluida la ausencia de red y de persistencia.

### Principios visuales
1. **Legible antes que ingenioso.** El código es acento, no decorado. El texto largo va siempre en sans (Inter), nunca en monoespaciada.
2. **Un guiño protagonista por vista.** Cada vista tiene como máximo un elemento de terminal destacado (prompt, cursor o glitch); el resto es interfaz sobria.
3. **El color comunica, nunca solo.** Azul = acción, enlace y foco; rojo = marca y prompt; ámbar = error; verde = éxito. Ningún estado depende solo del color.
4. **Quieto por defecto.** El movimiento presenta o confirma y termina rápido; nada decora en bucle.
5. **Sintaxis plausible.** Los guiños de código usan comandos y sintaxis verosímiles y en contexto (p. ej. `$ ./tiendadcc --catalogo`), sin chistes que distraigan de comprar.

## Usuarios
- **Visitante / comprador potencial**: estudiante, docente o funcionario del DCC (u otra persona) que recorre la tienda. Espera reconocer una estética cercana a sus herramientas, leer con comodidad, navegar por teclado y que se respete su preferencia de movimiento reducido.
- **Desarrollador /s**: (implícito) quien implementa specs de UI y necesita tokens, primitivas, componentes permitidos y reglas verificables.

## Historias de usuario
- Como visitante informático, quiero que la tienda use un lenguaje visual de terminal/IDE, para sentir que fue hecha para mí.
- Como visitante, quiero que todas las páginas compartan colores, tipografía y controles, para entender de inmediato qué es interactivo.
- Como visitante, quiero distinguir un error de un elemento rojo de la marca, para no confundir un aviso con decoración.
- Como visitante, quiero ver siempre dónde está el foco del teclado, para navegar sin mouse.
- Como visitante sensible al movimiento, quiero que la tienda respete siempre mi preferencia de movimiento reducido, para usarla sin molestias.
- Como desarrollador, quiero una lista cerrada de componentes y dependencias, y una ubicación clara para el código de terceros, para no sumar código ni paquetes sin revisar.

## Requisitos funcionales

**RF-1 — Paleta base en `@theme`.**
El sistema deberá declarar en el bloque `@theme` de `styles.css` la paleta base. Es la única fuente de verdad del color: el azul y el rojo institucionales, con sus variantes ajustadas para el fondo oscuro, más neutros, ámbar de error y verde de éxito.

| Token base | Hex | Rol |
|---|---|---|
| `--color-dcc-blue-700` | `#0f4e9e` | Azul institucional original; botón sólido de marca |
| `--color-dcc-blue-400` | `#5b9dff` | Azul ajustado para fondo oscuro; texto, enlaces y foco |
| `--color-dcc-red-600` | `#c4161c` | Rojo institucional original; botón sólido de marca |
| `--color-dcc-red-400` | `#ff5a5f` | Rojo ajustado para fondo oscuro; prompt `$`, cursor y glitch |
| `--color-ink-950` | `#0b1220` | Fondo de página |
| `--color-ink-900` | `#111a2e` | Superficie de tarjetas y ventana de terminal |
| `--color-ink-850` | `#151e33` | Superficie atenuada |
| `--color-ink-800` | `#1a2540` | Superficie secundaria y fondo al pasar el mouse |
| `--color-ink-700` | `#24314d` | Bordes decorativos |
| `--color-ink-500` | `#5a6b8c` | Borde de campos de formulario |
| `--color-ink-300` | `#8b9bb4` | Texto secundario |
| `--color-ink-100` | `#e6edf3` | Texto principal |
| `--color-amber-400` | `#ff9f43` | Error |
| `--color-green-500` | `#3fb950` | Éxito del terminal (`✓ ok`) |

Criterios de aceptación:
- Cuando se inspeccione `styles.css`, el bloque `@theme` deberá declarar exactamente los tokens base de la tabla con esos valores.
- Cuando todas las fases de RF-11 estén completas, las escalas anteriores `brand-*` y `accent-*` deberán haber sido eliminadas. Hasta entonces pueden convivir con la paleta nueva.
- Cuando cualquier componente adoptado aplique color, no deberá usar valores literales (hex, `rgb()`, `oklch()`), clases de paleta por defecto de Tailwind (p. ej. `slate-*`) ni `brand-*`/`accent-*`, sino tokens semánticos (RF-2) o propios (RF-3).

**RF-2 — Tokens semánticos de shadcn/ui.**
El sistema deberá definir los tokens semánticos que usan las primitivas de shadcn/ui como variables CSS que apunten a la paleta base. Deberán exponerse como clases de Tailwind mediante `@theme inline` y cumplir los contrastes de la tabla (WCAG 2.1 AA: 4,5:1 para texto y 3:1 para foco y bordes de campos).

| Token shadcn | Valor | Par evaluado | Contraste |
|---|---|---|---|
| `background` / `foreground` | ink-950 / ink-100 | texto sobre fondo | 15,85:1 |
| `card`, `popover` / `card-foreground`, `popover-foreground` | ink-900 / ink-100 | texto sobre tarjeta | 14,68:1 |
| `secondary` / `secondary-foreground` | ink-800 / ink-100 | texto sobre superficie secundaria | 12,85:1 |
| `muted` / `muted-foreground` | ink-850 / ink-300 | texto secundario sobre superficie atenuada | 5,88:1 |
| `muted-foreground` sobre `background` | ink-300 / ink-950 | | 6,64:1 |
| `muted-foreground` sobre `card` | ink-300 / ink-900 | | 6,15:1 |
| `muted-foreground` sobre `secondary` | ink-300 / ink-800 | | 5,39:1 |
| `primary` / `primary-foreground` | dcc-blue-400 / ink-950 | botón principal | 6,88:1 |
| `primary` como texto sobre `background` | dcc-blue-400 / ink-950 | enlaces | 6,88:1 |
| `primary` como texto sobre `card` | dcc-blue-400 / ink-900 | | 6,37:1 |
| `accent` / `accent-foreground` | ink-800 / ink-100 | fondo neutro al pasar el mouse (uso de shadcn, no color de marca) | 12,85:1 |
| `destructive` / `destructive-foreground` | amber-400 / ink-950 | botón de error | 9,18:1 |
| `destructive` como texto sobre `background` | amber-400 / ink-950 | | 9,18:1 |
| `destructive` como texto sobre `card` | amber-400 / ink-900 | | 8,50:1 |
| `ring` sobre `background` | dcc-blue-400 / ink-950 | anillo de foco | 6,88:1 |
| `input` sobre `background` | ink-500 / ink-950 | borde de campo | 3,49:1 |
| `input` sobre `card` | ink-500 / ink-900 | | 3,23:1 |
| `border` sobre `background` | ink-700 / ink-950 | borde decorativo, no transmite información | 1,45:1 (no exigible) |

Criterios de aceptación:
- Cuando se inspeccione `styles.css`, deberán existir todos los tokens de la tabla, mapeados a los valores indicados y utilizables como clases (p. ej. `bg-background`, `text-muted-foreground`, `ring-ring`).
- Cuando se mida el contraste de cada par de la tabla con la fórmula de WCAG 2.1, deberá obtenerse al menos el valor indicado.
- Cuando la primitiva `Button` use la variante `destructive`, su texto deberá usar `text-destructive-foreground` y no `text-white` (blanco sobre ámbar da 2,04:1).

**RF-3 — Tokens propios de marca y terminal.**
El sistema deberá definir tokens propios, fuera de los de shadcn, para los usos de marca y de terminal:

| Token | Valor | Par evaluado | Contraste |
|---|---|---|---|
| `brand-blue` / `brand-blue-foreground` | dcc-blue-700 / blanco | botón de marca azul | 8,07:1 |
| `brand-red` / `brand-red-foreground` | dcc-red-600 / blanco | botón de marca rojo | 6,04:1 |
| `terminal-prompt` sobre `background` | dcc-red-400 / ink-950 | prompt `$`, cursor | 6,13:1 |
| `terminal-prompt` sobre `card` | dcc-red-400 / ink-900 | prompt dentro de la ventana de terminal | 5,68:1 |
| `terminal-success` sobre `background` | green-500 / ink-950 | `✓ ok` | 7,37:1 |
| `terminal-success` sobre `card` | green-500 / ink-900 | | 6,83:1 |

Criterios de aceptación:
- Cuando se inspeccione `styles.css`, deberán existir los tokens de la tabla, utilizables como clases (p. ej. `bg-brand-red`, `text-terminal-prompt`).
- Cuando se mida el contraste de cada par de la tabla, deberá obtenerse al menos el valor indicado.
- Cuando un error y un elemento rojo de marca aparezcan en la misma vista, el error deberá usar `destructive` (ámbar) y comunicarse además con texto en español o un ícono con nombre accesible.

**RF-4 — Tema oscuro único.**
El sistema deberá mostrar siempre el tema oscuro definido por RF-1–RF-3, independiente de la preferencia del sistema operativo, sin selector de tema y sin almacenamiento en el navegador.
Criterios de aceptación:
- Cuando la página cargue con `prefers-color-scheme: light` o `dark`, deberá mostrarse el mismo tema oscuro.
- Cuando la página cargue, el documento deberá declarar `color-scheme: dark` y no deberá mostrarse un fondo claro antes del oscuro.
- Cuando una primitiva o componente de terceros use la variante `dark:` de Tailwind, esa variante deberá aplicarse siempre. Se logra con una clase estática `dark` en `<html>` y la variante `@custom-variant dark` asociada a ella, sin JavaScript.
- Cuando se renderice cualquier vista, no deberá existir un selector de tema ni lecturas o escrituras en `localStorage`, `sessionStorage` o cookies.

**RF-5 — Tipografía local.**
El sistema deberá usar dos familias variables empaquetadas localmente:
- **JetBrains Mono**, para títulos, precios, el hero de terminal y los acentos;
- **Inter**, para el texto largo.

Criterios de aceptación:
- Cuando se inspeccione `main.tsx`, deberá importar `@fontsource-variable/jetbrains-mono` y `@fontsource-variable/inter` (CSS empaquetado por Vite, sin CDN).
- Cuando se inspeccione `styles.css`, el `@theme` deberá definir `--font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;` y `--font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;`.
- Cuando se renderice cualquier vista, el `body` deberá usar `font-sans`.
- Cuando se renderice cualquier vista, los títulos (`h1`–`h3`), los precios, el hero de terminal, los prompts y los acentos (insignias, etiquetas de categoría, logo "TiendaDCC") deberán usar `font-mono`.
- Cuando se renderice el texto largo (descripciones, párrafos, campos y etiquetas de formulario, mensajes), deberá usar `font-sans`.
- Cuando se cargue cualquier vista sin conexión a internet, ambas familias deberán mostrarse sin peticiones de red.

**RF-6 — Escala de duraciones y curvas.**
El sistema deberá definir la escala de movimiento y consumirla tanto desde CSS como desde Motion. Las duraciones son 150 ms (`fast`), 250 ms (`base`) y 400 ms (`slow`), con una curva estándar `cubic-bezier(0.2, 0, 0, 1)`.
Criterios de aceptación:
- Cuando se inspeccione `styles.css`, deberán existir `--duration-fast: 150ms`, `--duration-base: 250ms`, `--duration-slow: 400ms` y `--ease-standard`.
- Cuando se inspeccione el código propio, deberá existir un módulo TypeScript que exporte las mismas duraciones (en segundos, para Motion) y la curva, sin valores repetidos a mano en los componentes.
- Cuando una animación de interfaz se ejecute, su duración no deberá superar 400 ms, salvo los efectos de texto de RF-7.

**RF-7 — Cuándo animar, cuándo no y límite del hero.**
El sistema deberá animar solo en estos casos:
- **Retroalimentación de interacción** (hover, foco, presión): `fast`.
- **Entrada de secciones y tarjetas**: una sola vez, al aparecer en pantalla, con `base` o `slow`.
- **Hero de inicio**: una sola vez, al cargar.

El sistema no deberá animar en estos casos:
- texto largo;
- campos de formulario mientras se escribe;
- cambio de filtro (la grilla se actualiza al instante);
- navegación entre rutas (sin transición de página);
- ningún efecto en bucle infinito.

Los efectos de texto (terminal, escritura, `DecryptedText`) podrán superar 400 ms, pero todas las animaciones del hero deberán terminar en menos de 2 s.
Criterios de aceptación:
- Cuando la página de inicio cargue, todas las animaciones del hero (retardos, escritura, glitch, entradas y `border-beam`) deberán haber terminado antes de 2 s desde el primer render. Después, el cursor queda visible y estático.
- Cuando el usuario navegue entre vistas o cambie un filtro, no deberá ejecutarse ninguna animación de transición que retrase el contenido o la interacción.
- Cuando una animación de entrada se ejecute, el contenido deberá estar en el DOM y ser accesible desde el primer render, y ningún control deberá quedar inoperable mientras dura.
- Cuando se ejecute un efecto de glitch, no deberá producir más de tres destellos por segundo (WCAG 2.3.1) y deberá ejecutarse una sola vez.
- Cuando el usuario abandone el inicio antes de que termine el hero, las animaciones deberán interrumpirse sin errores ni navegaciones encoladas.

**RF-8 — Movimiento reducido obligatorio.**
Cuando el usuario tenga activa `prefers-reduced-motion: reduce`, el sistema deberá desactivar las animaciones o reducirlas al mínimo, y todo texto animado deberá aparecer completo de inmediato.
Criterios de aceptación:
- Cuando la preferencia esté activa, la raíz de la app deberá configurar Motion para respetar la preferencia del usuario (`MotionConfig` con `reducedMotion="user"`).
- Cuando la preferencia esté activa, los textos de `terminal`, `typing-animation` y `DecryptedText` deberán mostrarse completos desde el primer render, sin escritura, sin cifrado y sin cursor parpadeante.
- Cuando la preferencia esté activa, `blur-fade` deberá mostrar el contenido en su estado final sin desenfoque ni desplazamiento, y `border-beam` no deberá renderizarse.
- Cuando la preferencia esté activa, ninguna transición ni animación CSS deberá ejecutarse más allá de un cambio de color u opacidad de 150 ms o menos.
- Cuando la preferencia esté activa, todo el contenido y los controles deberán seguir visibles y operables.

**RF-9 — Primitivas de UI (shadcn/ui).**
El sistema deberá ofrecer primitivas generadas con la CLI de shadcn/ui, en estilo `new-york`, TypeScript y sin RSC: `button`, `card`, `badge`, `input`, `label`, `toggle` y `toggle-group`.
Criterios de aceptación:
- Cuando se inspeccione `src/components/ui/`, deberán existir esas siete primitivas.
- Cuando se use `Button`, deberá ofrecer al menos las variantes `default` (primary), `brand` (brand-red), `destructive`, `outline`, `secondary`, `ghost` y `link`, y los tamaños `sm`, `default` y `lg`.
- Cuando se use `Button` para navegar, deberá renderizarse como `Link` de `react-router-dom` (vía `asChild`), sin anidar un botón dentro de un enlace.
- Cuando el usuario enfoque con teclado cualquier primitiva, deberá mostrarse un anillo visible del token `ring` (solo con `:focus-visible`).
- Cuando un `Toggle` esté activo, deberá exponer `aria-pressed="true"` y distinguirse de los inactivos por algo más que el color.
- Cuando una primitiva esté deshabilitada, deberá verse atenuada y no deberá responder a clic ni teclado.

**RF-10 — Lista cerrada de componentes animados de terceros.**
El sistema solo podrá incorporar los siguientes componentes animados de terceros. Todos animan exclusivamente con `motion` (verificado en su registro el 2026-10-03) y no usan gsap, three, ogl ni WebGL.

| # | Componente | Origen | Dependencias | Dónde se usa |
|---|---|---|---|---|
| 1 | `terminal` | Magic UI (registro shadcn) | `motion` (lo importa, aunque su ficha del registro no lo declare), `cn` | Ventana de terminal del hero en Inicio |
| 2 | `typing-animation` | Magic UI (registro shadcn) | `motion`, `cn` | Líneas escritas dentro del terminal del hero (p. ej. `$ ./tiendadcc --catalogo`) |
| 3 | `DecryptedText` | React Bits, variante TS + Tailwind (registro shadcn) | `motion` | Glitch sutil, una vez, en el título "TiendaDCC" del hero y en "Producto no encontrado" |
| 4 | `blur-fade` | Magic UI (registro shadcn) | `motion`, `cn` | Entrada de secciones y tarjetas en Inicio, Catálogo y Detalle |
| 5 | `border-beam` | Magic UI (registro shadcn) | `motion`, `cn` | Borde de la ventana de terminal del hero; una sola pasada (RF-7) |

Criterios de aceptación:
- Cuando se inspeccione el frontend, todo componente animado de terceros deberá ser uno de los cinco de la tabla y usarse solo donde indica la columna "Dónde se usa".
- Cuando se incorpore uno de estos componentes, sus imports deberán limitarse a `react`, `motion/react` y `@/lib/utils`.
- Cuando un componente de la tabla no respete por sí mismo RF-7 o RF-8, deberá ajustarse su código. Ninguno de los cinco lo hace sin ajustes en la versión verificada.
- Cuando un componente sea decorativo (`border-beam`), deberá llevar `aria-hidden="true"` y no deberá ser focable.
- Cuando un componente anime texto, el texto completo deberá estar disponible para tecnologías de asistencia desde el primer render.
- Cuando se quiera usar otro componente, o uno que dependa de `gsap`, `three`, `@react-three/*`, `ogl`, `cobe`, `next-themes` o WebGL, no deberá incorporarse sin actualizar antes esta spec. Los de gsap, three, ogl y WebGL quedan prohibidos.

**RF-11 — Ubicación del código de terceros y adopción por fases.**
El sistema deberá separar el código de terceros del propio por carpeta y por cabecera:

| Carpeta | Contenido | Nombres |
|---|---|---|
| `src/components/ui/` | Primitivas de shadcn/ui | Originales (kebab-case) |
| `src/components/magicui/` | Componentes de Magic UI | Originales (kebab-case) |
| `src/components/reactbits/` | Componentes de React Bits | Originales (PascalCase) |
| `src/lib/utils.ts` | Utilidad `cn` | — |
| `src/components/` (raíz), `pages/`, `logic/`, `data/` | Código propio | Convenciones actuales (PascalCase, sin subcarpetas) |

Las vistas se migran en este orden, cerrando cada fase con `npm run check` en verde:
1. **Fase 1 — Inicio**, con `Header`, `ProductGrid`, `ProductCard` y `AuthBar`.
2. **Fase 2 — Catálogo** (`CategoryFilter`).
3. **Fase 3 — Detalle de producto** y su estado de no encontrado.
4. **Fase 4 — Registro e inicio de sesión** (`TextField`).

Criterios de aceptación:
- Cuando se inspeccione cualquier archivo de `components/ui/`, `components/magicui/`, `components/reactbits/` o `lib/utils.ts`, deberá comenzar con un comentario de cabecera con origen, nombre del componente, URL del registro, fecha de incorporación y lista de cambios hechos (o "sin cambios").
- Cuando se inspeccione la raíz de `src/components/`, no deberá contener código de terceros.
- Cuando se inspeccione `components.json`, sus alias deberán apuntar a `@/components`, `@/components/ui`, `@/lib` y `@/lib/utils`, y deberá declarar los registros de Magic UI y React Bits.
- Cuando una fase se dé por terminada, sus vistas deberán cumplir RF-1–RF-10. Además, los textos, rutas, roles, jerarquía de encabezados, tarjetas como enlace y filtros con `aria-pressed` de 001–003 deberán conservarse, salvo que los cambie explícitamente la spec de la vista.
- Cuando se ejecuten los tests existentes tras una fase, deberán pasar. Si fallan por un cambio de texto o rol, ese cambio deberá estar sancionado en una spec y los tests deberán actualizarse a ella.

**RF-12 — Restricciones de compatibilidad.**
El sistema no deberá contener código específico de Next.js y toda navegación interna deberá ser compatible con `HashRouter`.
Criterios de aceptación:
- Cuando se busque en `src/`, no deberán aparecer imports de `next/*` (`next/image`, `next/link`, `next/font`, `next/navigation`), `next-themes` ni la directiva `"use client"` (se elimina del código copiado).
- Cuando un componente navegue a una ruta interna, deberá hacerlo con `Link` o `useNavigate` de `react-router-dom`, nunca con `<a href="/...">` ni `window.location`.
- Cuando la app se sirva con `HashRouter`, todas las URLs visibles (`#/`, `#/catalogo`, `#/producto/:id`, `#/registro`, `#/iniciar-sesion`) deberán ser las mismas que antes de esta spec.
- Cuando se ejecute `npm run check`, el código propio y el de terceros deberán pasar `tsc --noEmit` con el `tsconfig` actual, sin excluir archivos ni relajar opciones (se ajusta el archivo copiado si no compila), y `vitest run` deberá pasar.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final, incluidos los nombres accesibles de íconos y los textos del terminal, deberá estar en español (constitución, §6). Los comandos de shell pueden usar nombres de comando y flags verosímiles, pero sus mensajes visibles van en español. Los identificadores de código van en inglés.
- **RNF-2 Sin backend, red ni persistencia.** El sistema no deberá realizar llamadas de red en tiempo de ejecución (fuentes, íconos, imágenes ni scripts) ni guardar datos en el navegador, igual que 001–003. La CLI de shadcn solo accede a la red en desarrollo, para copiar código.
- **RNF-3 Responsividad.** Cuando cualquier vista se visualice desde 360 px de ancho hasta escritorio, no deberá haber desplazamiento horizontal. El texto en `font-mono` y la ventana de terminal deberán envolverse o adaptarse sin recortar contenido.
- **RNF-4 Accesibilidad.** Los pares de RF-2 y RF-3 deberán cumplir sus ratios. El foco deberá ser visible con el token `ring`. Todo deberá ser operable mediante teclado, y ningún estado deberá depender solo del color.
- **RNF-5 Desempeño.** Cuando el usuario navegue o interactúe, la respuesta deberá ser inmediata, sin recarga completa del sitio. Las animaciones deberán usar solo `opacity`, `transform` y `filter`, y no deberán degradar la fluidez del desplazamiento.
- **RNF-6 Dependencias aprobadas.** Constituyen la excepción a la constitución §1 que sanciona esta spec. Se suman a las ya sancionadas: Vitest, jsdom y @testing-library/react (001), y `react-router-dom@^7` (003).

  | Paquete / código | Tipo | Justificación y alcance |
  |---|---|---|
  | `motion` | npm (producción) | Motor de animación de RF-6–RF-8 y única dependencia de animación de los cinco componentes de RF-10. Se usa también para `MotionConfig` (movimiento reducido). |
  | `@fontsource-variable/jetbrains-mono` | npm (producción) | Fuente monoespaciada local de títulos, precios, hero y acentos (RF-5); evita CDN (RNF-2). |
  | `@fontsource-variable/inter` | npm (producción) | Fuente sans local para texto largo (RF-5); evita CDN (RNF-2). |
  | `clsx` | npm (producción) | Composición condicional de clases dentro de `cn` (`lib/utils.ts`). |
  | `tailwind-merge` | npm (producción) | Resuelve conflictos de clases de Tailwind dentro de `cn`. |
  | `class-variance-authority` | npm (producción) | Variantes tipadas de `button`, `badge` y `toggle` (RF-9). |
  | `radix-ui` | npm (producción) | Base accesible de `Slot` (`asChild` para `Link`), `label`, `toggle` y `toggle-group` (RF-9). |
  | `lucide-react` | npm (producción) | Íconos locales de la librería por defecto de shadcn; requeridos para que los errores no dependan solo del color (RF-3). |
  | `shadcn` (CLI) | Herramienta vía `npx`, **no** se instala | Genera `components.json` y copia primitivas y componentes de los registros de shadcn, Magic UI y React Bits. |
  | Primitivas de shadcn/ui | Código copiado (`components/ui/`) | RF-9. |
  | Componentes de Magic UI | Código copiado vía registro shadcn (`components/magicui/`) | `terminal`, `typing-animation`, `blur-fade`, `border-beam` (RF-10). |
  | Componentes de React Bits | Código copiado vía registro shadcn, variante TS + Tailwind (`components/reactbits/`) | `DecryptedText` (RF-10). |
  | `lib/utils.ts` (`cn`) | Código copiado | Implementado con `clsx` + `tailwind-merge`. Si la CLI genera `export { cn } from "cn"`, se reemplaza y el paquete `cn` no se instala. |

  No se instala `tw-animate-css`: si la CLI lo agrega a `styles.css` o a `package.json`, se elimina, porque Motion cubre las animaciones. Cualquier otra dependencia exige actualizar antes esta spec.
- **RNF-7 Alias `@/`.** Se habilita `@/*` → `src/*` en `tsconfig.json` (`paths`) y en `vite.config.ts` (`resolve.alias`), porque la CLI lo requiere. El código nuevo puede usarlo, y los imports relativos existentes no se migran.
- **RNF-8 Tests.** El módulo de duraciones (RF-6) y toda lógica de temporización del hero (p. ej. el cálculo de retardos para terminar en menos de 2 s) deberán ser funciones puras con tests (constitución, §3–§4). `setupTests.ts` deberá simular `matchMedia`, `IntersectionObserver` y `ResizeObserver` sin alterar las aserciones existentes. Deberá existir al menos un test de render que, con `prefers-reduced-motion: reduce` simulado, verifique que el texto del hero aparece completo en el primer render.
- **RNF-9 Verificación.** `npm run check` sigue siendo `tsc --noEmit && vitest run` y deberá pasar al cerrar cada fase. No se agrega linter.

## Casos límite
- **Sistema operativo en modo claro:** se muestra igual el tema oscuro, sin destello claro (RF-4).
- **Movimiento reducido activo:** los textos del terminal y de `DecryptedText` aparecen completos, `blur-fade` muestra el estado final, `border-beam` no se renderiza y todo sigue operable (RF-8).
- **Texto del hero más largo de lo previsto:** se ajustan velocidades y retardos para terminar antes de 2 s; el texto no se trunca (RF-7).
- **Salida del inicio antes de que termine el hero:** las animaciones se interrumpen sin errores; al volver, el hero se reproduce de nuevo dentro del mismo presupuesto (RF-7).
- **Error y rojo de marca en la misma vista:** el error es ámbar y lleva texto o ícono (RF-3).
- **Archivo copiado con `"use client"`, `next/*` o un import a `@/lib/utils` con otra forma:** se ajusta antes de integrarlo (RF-12).
- **La CLI genera `cn` desde el paquete `cn` o agrega `tw-animate-css`:** se reemplaza o elimina según RNF-6.
- **Entorno de tests (jsdom) sin `matchMedia`, `IntersectionObserver` ni `ResizeObserver`:** los componentes renderizan sin lanzar errores (RNF-8).
- **Sin conexión a internet:** fuentes, íconos y animaciones funcionan igual (RNF-2).
- **Nombres de producto largos en `font-mono`:** `Card` y `Badge` envuelven el texto sin romper la grilla (RNF-3).
- **Foco de teclado sobre la ventana de terminal con `border-beam`:** el haz no captura foco ni clic y el anillo sigue visible (RF-10).
- **Imagen de producto faltante en una `Card`:** el layout no se rompe y se conserva el texto alternativo (002).
- **Vista aún no migrada durante una fase:** sigue funcionando y siendo legible sobre el fondo oscuro (RF-11).

## Fuera de alcance
- Tema claro y selector de tema.
- Contenido nuevo de las vistas (secciones, textos o comandos concretos del hero): requiere la spec de la vista. Esta spec solo fija dónde y cómo se usan los componentes.
- Precios en los datos: RF-5 fija su tipografía, pero añadirlos exige cambiar el formato del JSON en otra spec.
- Componentes fuera de la lista de RF-10, y cualquier componente con gsap, three, ogl o WebGL.
- Migración de los imports relativos existentes al alias `@/`.
- Backend, API, base de datos, persistencia en el navegador, autenticación real, carrito, checkout y pagos.
- Despliegue y entorno de producción.
- **Pendientes registrados para corregir aparte:**
  - Incoherencia de stack Hono/Express: la constitución §1 dice Hono, mientras que `AGENTS.md`, `README.md` y la skill `generar-spec` dicen Express.
  - Mención a build: la tarea 17 de `specs/001-tiendaDCC/tasks.md` atribuye "build" a `npm run check`, que solo ejecuta `tsc --noEmit && vitest run`.
  - ESLint: no se agrega en este trabajo.
  - Spec duplicada: `specs/000-design-system/spec.md` es un borrador anterior que esta spec reemplaza; el equipo debe eliminarlo.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. `styles.css` declara la paleta base de RF-1 en `@theme` y ningún componente usa colores literales, paletas por defecto ni `brand-*`/`accent-*` (RF-1).
2. Existen los tokens semánticos de shadcn y los tokens propios con los valores y contrastes de las tablas (RF-2, RF-3).
3. El `Button` destructivo usa `text-destructive-foreground` y los errores se comunican también con texto o ícono (RF-2, RF-3).
4. La tienda se muestra siempre en tema oscuro, sin destello claro, con `dark:` siempre activo y sin selector ni almacenamiento (RF-4).
5. JetBrains Mono e Inter se cargan desde `@fontsource-variable` en `main.tsx` y se aplican según RF-5.
6. Existen las duraciones 150/250/400 ms y la curva en CSS y en un módulo TS con tests (RF-6, RNF-8).
7. Solo se anima en los casos de RF-7 y el hero termina antes de 2 s, sin bucles infinitos (RF-7).
8. Con `prefers-reduced-motion: reduce`, el texto animado aparece completo de inmediato y no hay animaciones más allá de cambios mínimos de color u opacidad, verificado al menos con un test (RF-8, RNF-8).
9. Existen las siete primitivas de shadcn con sus variantes, foco visible y `Link` vía `asChild` (RF-9).
10. Solo se usan los cinco componentes de RF-10, en los lugares indicados y con imports limitados a `react`, `motion/react` y `@/lib/utils` (RF-10).
11. El código de terceros vive en `components/ui/`, `components/magicui/`, `components/reactbits/` y `lib/utils.ts`, con su cabecera de origen, y las cuatro fases están completas, empezando por el inicio (RF-11).
12. No hay código de Next.js, la navegación interna usa `react-router-dom` y las URLs con `HashRouter` no cambian (RF-12).
13. Solo se agregaron las dependencias de RNF-6 y el alias `@/` está configurado en TypeScript y Vite (RNF-6, RNF-7).
14. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Dirección visual: "IDE institucional" (opción A), con azul y rojo del DCC como fuente de verdad, ajustados para AA sobre fondo oscuro.
- [RESUELTO] Solo modo oscuro, sin selector de tema y sin `localStorage`, respetando 001–003.
- [RESUELTO] Tipografía local: `@fontsource-variable/jetbrains-mono` (títulos, precios, hero y acentos) e `@fontsource-variable/inter` (texto largo).
- [RESUELTO] Duraciones 150/250/400 ms. Los efectos de texto pueden durar más, pero el hero completo termina en menos de 2 s.
- [RESUELTO] `prefers-reduced-motion` obligatorio: animaciones desactivadas o mínimas y texto animado completo de inmediato.
- [RESUELTO] El token `accent` de shadcn se usa como fondo neutro al pasar el mouse. El rojo institucional vive en `brand-red` y `terminal-prompt`, y las escalas `brand-*`/`accent-*` se reemplazan por `dcc-blue-*`/`dcc-red-*` durante la migración.
- [RESUELTO] El `Button` destructivo usa `text-destructive-foreground` (9,18:1) en vez de `text-white` (2,04:1).
- [RESUELTO] Código de terceros en `components/ui/`, `components/magicui/`, `components/reactbits/` y `lib/utils.ts`, con cabecera de origen; el código propio sigue plano en PascalCase.
- [RESUELTO] Instalación con la CLI de shadcn, incluidos los registros de Magic UI y React Bits; React Bits en variante TS + Tailwind.
- [RESUELTO] Lista cerrada de cinco componentes que animan solo con `motion`. Quedan descartados:
  - `word-rotate`: anima en bucle e incumple el límite del hero.
  - `hyper-text`: duplica a `DecryptedText`.
  - `shiny-button` y `TiltedCard`: riesgo de parodia.
  - `number-ticker` y `CountUp`: aún no hay cifras.
  - `magic-card`: requiere `next-themes`.
  - Todo lo que use gsap, ogl, three o WebGL.
- [RESUELTO] Interpretación del límite de 2 s: incluye `border-beam` (una sola pasada) y el parpadeo del cursor, que queda estático al terminar el hero.
- [PENDIENTE — fuera de esta spec] Hono/Express, mención a build en tareas de 001, ESLint y eliminación de `specs/000-design-system/spec.md` (ver Fuera de alcance).
