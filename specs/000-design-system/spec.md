# Spec 000 — Sistema de diseño (tokens, tema oscuro, primitivas de UI y movimiento)

> **Aclaración: por qué el id `000`.** Esta spec no es una funcionalidad más en la secuencia 001→003, sino la **base transversal** de la interfaz: toda spec que toque UI (las existentes y las futuras) debe leerla antes (regla de AGENTS.md). Por eso precede numéricamente a las demás en vez de ocupar el id siguiente (`004`).

## Contexto y objetivo
Las specs 001, 002 y 003 dejaron una tienda **solo frontend** (inicio, registro, inicio de sesión, detalle y catálogo) cuyo estilo vive disperso en clases utilitarias de Tailwind v4 escritas a mano en cada componente. El único acuerdo de diseño es la paleta `brand` (azul institucional U. de Chile) y `accent` (rojo) declarada en el `@theme` de `styles.css` (duda resuelta de 001). No existen tokens semánticos, tipografía propia, primitivas de UI reutilizables (cada botón repite sus clases), reglas de movimiento ni criterios comunes de contraste o foco.

Esta spec define el **sistema de diseño** de tiendaDCC y su **adopción en todas las vistas**:
1. **Tokens** de color para un **único tema oscuro**, con el azul y el rojo institucionales ajustados para contraste AA y un color de error propio.
2. Dos **familias tipográficas locales**: JetBrains Mono para títulos, precios, el hero de terminal y los acentos; Inter para el texto largo.
3. **Tokens** de radio, sombra y movimiento.
4. **Primitivas de UI** generadas con la CLI de shadcn/ui (variante TypeScript + Tailwind).
5. **Movimiento** con Motion, siempre respetando `prefers-reduced-motion`.
6. Una **lista cerrada de componentes animados** de Magic UI y React Bits que dependen únicamente de Motion; ninguno usa WebGL ni three.js.
7. La **adopción por fases**, empezando por la página de inicio (fase 1).

El sistema autoriza a **reemplazar toda la presentación existente** (marcado, clases, componentes y layout). Los requisitos funcionales de 001–003 (textos, rutas, roles y comportamiento) siguen vigentes salvo que la spec de la vista los cambie explícitamente (RF-10). Ninguna de estas librerías es obligatoria: esta spec las sanciona como opción y fija las condiciones de uso. Sigue sin haber backend, API ni persistencia de ningún tipo; tampoco hay selector de tema.

## Usuarios
- **Visitante / comprador potencial**: persona que recorre la tienda y espera una interfaz coherente y legible, accesible por teclado y que respete su preferencia de movimiento reducido.
- **Desarrollador /s**: (implícito) quien implementa specs de UI y necesita un vocabulario común de tokens, primitivas, componentes permitidos y reglas verificables.

## Historias de usuario
- Como visitante, quiero que todas las páginas compartan colores, tipografía y estilos de botones, para reconocer la tienda y entender qué es interactivo.
- Como visitante, quiero distinguir un error de un elemento destacado de la marca, para no confundir un aviso con decoración.
- Como visitante, quiero ver siempre dónde está el foco del teclado, para navegar la tienda sin mouse.
- Como visitante sensible al movimiento, quiero que la tienda respete siempre mi preferencia de movimiento reducido, para usarla sin molestias.
- Como visitante, quiero que las animaciones terminen rápido y no me impidan leer ni usar el contenido, para que la tienda siga siendo ágil.
- Como desarrollador, quiero tokens, primitivas y una lista cerrada de componentes animados, para construir vistas sin reinventar estilos ni sumar dependencias no revisadas.

## Requisitos funcionales

**RF-1 — Tokens de color semánticos.**
El sistema deberá exponer tokens semánticos de color utilizables como clases de Tailwind, cuyo valor provenga de las escalas `brand` (azul institucional) y `accent` (rojo institucional) o de neutros. Ambas escalas se ajustan en valor para cumplir RNF-4 y constituyen la única fuente de verdad del color.
Criterios de aceptación:
- Cuando se inspeccione la hoja de estilos global, deberán existir los tokens `background`, `foreground`, `card`, `card-foreground`, `primary`, `primary-foreground`, `accent`, `accent-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `destructive` y `destructive-foreground`, utilizables como clases (p. ej. `bg-primary`, `text-muted-foreground`).
- Cuando se inspeccione la hoja de estilos global, `primary` deberá resolver a un tono de la escala `brand` (azul) y `accent` a un tono de la escala `accent` (rojo).
- Cuando cualquier componente aplique color, no deberá usar valores de color literales (hex, `rgb()`, `oklch()`) en sus clases ni en estilos en línea, ni clases de paleta por defecto de Tailwind (p. ej. `slate-*`), sino tokens.

**RF-2 — Tema oscuro único.**
El sistema deberá mostrar siempre un único tema oscuro, independiente de la preferencia de esquema de color del sistema operativo, sin control para cambiarlo y sin guardar nada en el navegador.
Criterios de aceptación:
- Cuando la página cargue con `prefers-color-scheme: light` o `dark`, deberá mostrarse el mismo tema oscuro.
- Cuando la página cargue, el documento deberá declarar `color-scheme: dark`, de modo que barras de desplazamiento y controles nativos también se vean oscuros.
- Cuando la página cargue, no deberá mostrarse un fondo claro antes del tema oscuro (el fondo oscuro se aplica desde el primer pintado).
- Cuando una primitiva o componente generado use la variante `dark:` de Tailwind, esa variante deberá aplicarse siempre, no solo cuando el sistema prefiera el modo oscuro.
- Cuando se renderice cualquier vista, no deberá existir un control de cambio de tema ni lecturas o escrituras en `localStorage`, `sessionStorage` o cookies.

**RF-3 — Color de error propio.**
El sistema deberá definir el token `destructive` como color de error propio, distinguible del rojo de marca (`accent`).
Criterios de aceptación:
- Cuando se inspeccione la hoja de estilos global, `destructive` no deberá tomar su valor de la escala `accent` ni coincidir con ninguno de sus tonos.
- Cuando un elemento con color `destructive` y uno con color `accent` aparezcan en la misma vista, deberán distinguirse visualmente entre sí. Los valores concretos se fijan en el plan.
- Cuando se muestre un estado de error, deberá comunicarse también con texto en español o con un ícono con nombre accesible, no solo con el color.

**RF-4 — Tipografía local en dos familias.**
El sistema deberá usar dos familias variables empaquetadas localmente: JetBrains Mono (`@fontsource-variable/jetbrains-mono`) e Inter (`@fontsource-variable/inter`), cada una expuesta como token de fuente con pila de respaldo del sistema.
Criterios de aceptación:
- Cuando se inspeccione la hoja de estilos global, el token `font-mono` deberá apuntar a JetBrains Mono y el token `font-sans` a Inter, cada uno con su pila de respaldo.
- Cuando se renderice cualquier vista, los títulos (`h1`–`h3`), los precios, el hero de terminal y los acentos tipográficos (insignias, etiquetas de categoría, cifras destacadas) deberán usar `font-mono`.
- Cuando se renderice cualquier vista, el texto largo (descripciones, párrafos, campos y etiquetas de formulario) deberá usar `font-sans`.
- Cuando se renderice cualquier página sin conexión a internet, ambas familias deberán cargarse sin peticiones de red (RNF-2).

**RF-5 — Tokens de radio, sombra y movimiento.**
El sistema deberá definir tokens de radio y sombra compartidos por las primitivas, y tokens de movimiento consumidos por las animaciones: duraciones de 150 ms (corta), 250 ms (media) y 400 ms (larga) y una curva estándar.
Criterios de aceptación:
- Cuando se inspeccione la hoja de estilos global, deberá existir un token de radio base del que deriven los radios de las primitivas.
- Cuando se inspeccione el frontend, deberán existir los tokens de movimiento de 150, 250 y 400 ms y la curva estándar.
- Cuando una animación de interfaz se ejecute, su duración no deberá superar 400 ms, salvo los efectos de texto (RF-6) y los efectos de ciclo continuo de la lista cerrada (RF-9).

**RF-6 — Excepción para efectos de texto y límite del hero.**
Los efectos de texto (terminal, escritura, `DecryptedText` y equivalentes de la lista cerrada) podrán durar más de 400 ms. El conjunto de animaciones del hero deberá terminar en menos de 2 s.
Criterios de aceptación:
- Cuando la página de inicio cargue, todas las animaciones del hero (incluidos retardos, efectos de texto y entradas) deberán haber terminado antes de 2 s desde el primer render.
- Cuando un efecto de texto esté en curso, el texto completo deberá estar disponible para tecnologías de asistencia desde el primer render.
- Cuando la preferencia de movimiento reducido esté activa, el texto de todo efecto de texto deberá aparecer completo de inmediato, sin animación de escritura, cifrado ni cursor parpadeante.

**RF-7 — Primitivas de UI.**
El sistema deberá ofrecer primitivas de UI generadas con la CLI de shadcn/ui: al menos botón, tarjeta, insignia, campo de texto, etiqueta y grupo de botones alternables, con variantes que cubran todos los estilos de control de la tienda.
Criterios de aceptación:
- Cuando se inspeccione el frontend, deberán existir las primitivas `Button`, `Card`, `Badge`, `Input`, `Label` y `ToggleGroup` (con `Toggle`).
- Cuando se use `Button`, deberá ofrecer al menos las variantes primaria, de acento, destructiva, contorno, fantasma y enlace, y al menos los tamaños pequeño, normal y grande.
- Cuando se use `Button` para navegar, deberá poder renderizarse como enlace (`Link`) conservando su estilo, sin anidar un botón dentro de un enlace.
- Cuando una vista adoptada (RF-10) muestre un botón, campo, tarjeta, insignia o filtro, deberá hacerlo mediante la primitiva correspondiente.

**RF-8 — Foco, interacción y movimiento reducido.**
Mientras un elemento interactivo tenga el foco del teclado, el sistema deberá mostrar un indicador de foco visible basado en el token `ring`. Cuando el usuario tenga activa `prefers-reduced-motion: reduce`, deberá suprimir **siempre** toda animación de desplazamiento, escala, rotación, inclinación, cambio de texto y ciclo continuo, mostrando el contenido en su estado final.
Criterios de aceptación:
- Cuando el usuario enfoque con teclado cualquier botón, enlace, tarjeta, filtro o campo, deberá mostrarse un anillo de foco visible del color del token `ring`.
- Cuando el usuario haga clic con el mouse sobre un elemento, no deberá mostrarse el anillo de foco (solo `:focus-visible`).
- Cuando un filtro o botón alternable esté activo, deberá exponer su estado (`aria-pressed` o equivalente) y distinguirse de los inactivos por algo más que el color.
- Cuando una primitiva esté deshabilitada, deberá verse atenuada y no deberá responder a clic ni teclado.
- Cuando una animación de entrada se ejecute, el contenido afectado deberá estar en el DOM y ser accesible desde el primer render, y ninguna animación deberá bloquear ni retrasar la interacción con los controles.
- Cuando la preferencia de movimiento reducido esté activa, las animaciones con Motion deberán mostrar su estado final sin desplazamiento, escala ni rotación; los contadores deberán mostrar su valor final; los textos rotativos, de terminal o "descifrados" deberán mostrarse completos y estáticos (RF-6); y los efectos de ciclo continuo (brillos, haces de borde, inclinación al pasar el mouse) no deberán moverse.
- Cuando la preferencia de movimiento reducido esté activa, las animaciones CSS (p. ej. utilidades de `tw-animate-css`) tampoco deberán ejecutarse.

**RF-9 — Lista cerrada de componentes animados.**
El sistema solo podrá incorporar componentes animados de terceros de la siguiente lista. Todos dependen únicamente de `motion` (según su registro, verificado el 2026-10-03), se instalan con su CLI en variante TypeScript + Tailwind y ninguno usa WebGL, canvas 3D ni three.js.

| Uso | Magic UI | React Bits |
|---|---|---|
| Terminal y escritura | `terminal`, `typing-animation` | — |
| Entrada de bloques y texto | `blur-fade`, `text-animate` | `BlurText` |
| Texto rotativo | `word-rotate` | `RotatingText` |
| Texto destacado | `sparkles-text`, `hyper-text` | `ShinyText`, `GradientText`, `DecryptedText` |
| Cifras | `number-ticker` | `CountUp` |
| Botones y tarjetas | `shiny-button`, `border-beam` | `TiltedCard` |
| Listas | `animated-list` | `AnimatedList` |

Criterios de aceptación:
- Cuando se inspeccione el frontend, todo componente animado de terceros deberá pertenecer a la lista anterior.
- Cuando se incorpore un componente de la lista, deberá verificarse que, en la versión instalada, solo importa `react`, `motion` y utilidades del propio proyecto. Si requiere otra dependencia, no deberá incorporarse sin actualizar antes esta spec.
- Cuando un componente de la lista se use, deberá cumplir RF-6 y RF-8; si no respeta por sí mismo `prefers-reduced-motion`, deberá ajustarse su código.
- Cuando un componente sea puramente decorativo, deberá estar oculto para tecnologías de asistencia (`aria-hidden="true"`) y no deberá ser focable.
- Cuando un efecto se superponga a texto, el contraste deberá cumplir RNF-4 en todo momento de la animación.
- Cuando se quiera usar un componente fuera de la lista (incluidos los que dependan de `gsap`, `next-themes`, `ogl`, `three`, `@react-three/*`, `cobe` o WebGL), no deberá incorporarse sin actualizar antes esta spec; los de WebGL y three.js quedan prohibidos.

**RF-10 — Adopción por fases y compatibilidad con 001–003.**
El sistema deberá migrar todas las vistas a los tokens, primitivas y reglas de esta spec en el orden siguiente, cerrando cada fase con `npm run check` en verde:
1. **Fase 1 — Inicio**, junto con los elementos globales que aparecen en él (`Header`, `ProductGrid`, `ProductCard`, `AuthBar`).
2. **Fase 2 — Catálogo** (`CategoryFilter`).
3. **Fase 3 — Detalle de producto** y su estado de no encontrado.
4. **Fase 4 — Registro e inicio de sesión** (`TextField`).

Durante la migración deberá conservar los requisitos funcionales de 001–003 (textos visibles, rutas con `HashRouter`, roles, jerarquía de encabezados, tarjetas como enlace, filtros con estado presionado, estados vacío y no encontrado, ausencia de persistencia), salvo los que la spec de una vista cambie explícitamente.
Criterios de aceptación:
- Cuando una fase se dé por terminada, sus vistas y componentes no deberán contener colores literales ni clases de paleta por defecto (RF-1) y deberán usar las primitivas (RF-7).
- Cuando una fase se dé por terminada, sus vistas deberán verse y operar correctamente en el tema oscuro, con y sin movimiento reducido.
- Cuando se ejecuten los tests existentes tras una fase, deberán pasar. Si fallan por un cambio de texto, rol o estructura, deberá existir una spec que sancione ese cambio, y los tests deberán actualizarse a ella.
- Cuando se renderice cualquier vista, sus URLs deberán ser las mismas que antes de esta spec.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final, incluidos los nombres accesibles de íconos y efectos, deberá estar en español (constitución, §6). Los identificadores de tokens, variantes y componentes van en inglés.
- **RNF-2 Sin backend, red ni persistencia.** El sistema no deberá realizar llamadas de red en tiempo de ejecución (ni fuentes, ni íconos, ni imágenes, ni scripts remotos) ni guardar datos en el navegador (`localStorage`, `sessionStorage`, cookies), igual que 001–003. La CLI de shadcn/ui solo se usa en desarrollo para generar código.
- **RNF-3 Responsividad.** Cuando cualquier vista se visualice desde 360 px de ancho hasta escritorio, las primitivas y los componentes animados no deberán provocar desplazamiento horizontal ni recortar contenido. Los textos en `font-mono` deberán envolverse sin desbordar.
- **RNF-4 Accesibilidad y contraste.** Sobre los fondos del tema oscuro, todas las combinaciones de texto y fondo de los tokens (incluidos `primary`, `accent` y `destructive` con su color de contraste) deberán cumplir contraste WCAG 2.1 AA: 4,5:1 para texto normal y 3:1 para texto grande, indicadores de foco y bordes de controles. Todo deberá seguir siendo operable mediante teclado.
- **RNF-5 Desempeño.** Cuando el usuario navegue entre vistas o interactúe con controles, la respuesta deberá ser inmediata, sin recarga completa del sitio. Los componentes animados no deberán degradar la fluidez del desplazamiento. Quedan prohibidos los componentes basados en WebGL o three.js.
- **RNF-6 Dependencias.** No se deben agregar dependencias fuera del stack definido (constitución, §1). Se mantienen las excepciones ya sancionadas: Vitest, jsdom y @testing-library/react (001), y `react-router-dom@^7` (003). Desde esta spec se suman como dependencias de producción:
  - las de las primitivas de shadcn/ui: `radix-ui`, `class-variance-authority`, `lucide-react`, `tw-animate-css` y la de la utilidad `cn` (`cn`, o `clsx` + `tailwind-merge`, según resuelva la versión de la CLI; el plan fija cuál);
  - `motion`, de la que dependen todos los componentes de RF-9;
  - `@fontsource-variable/jetbrains-mono` y `@fontsource-variable/inter`.

  La CLI de shadcn/ui se ejecuta con `npx` y no se agrega como dependencia. Cualquier otra dependencia exige actualizar antes esta spec.
- **RNF-7 Convenciones de código.** Se mantiene la estructura actual de carpetas (`components/`, `pages/`, `logic/` y `data/`); no se crean `components/ui/`, `lib/` ni `hooks/`.
  - **Ubicación:** la CLI se configura (`components.json`) para que las primitivas y los componentes animados queden en `components/` y la utilidad `cn` en `logic/`.
  - **Nombres:** los archivos generados se renombran a PascalCase, como el resto de `components/`, y se ajustan sus imports.
  - **Alias `@/`:** se habilita `@/` → `src/` porque la CLI lo requiere. El código generado puede usarlo y los imports relativos existentes no se migran.
  - **TypeScript:** el código generado deberá compilar con el `tsconfig` actual sin excluir archivos ni relajar opciones. Si no compila, se ajusta el archivo generado.
- **RNF-8 Lint.** No se agrega linter ni formatter (ESLint, Prettier, Biome); `npm run check` mantiene su contenido actual.
- **RNF-9 Tests.** Toda lógica no trivial que se agregue (p. ej. el cálculo de retardos y duraciones del hero para cumplir el límite de 2 s, si se implementa como función) deberá vivir como función pura en `logic/` y tener tests (constitución, §3–§4). El entorno de tests deberá simular las APIs de navegador que requieran Motion y los componentes de RF-9 (`matchMedia`, `IntersectionObserver`, `ResizeObserver`). `npm run check` deberá pasar al cerrar cada fase (RF-10).

## Casos límite
- **Sistema operativo en modo claro:** la tienda se muestra igualmente en el tema oscuro, sin flash claro al cargar (RF-2).
- **Movimiento reducido activo:** el contenido aparece en su estado final, los contadores muestran su valor final, el texto del terminal y de `DecryptedText` aparece completo sin cursor parpadeante, y no corre ninguna animación CSS (RF-6, RF-8).
- **Texto del hero más largo de lo previsto:** las velocidades o retardos de los efectos deben ajustarse para que el hero termine antes de 2 s; no se trunca el texto (RF-6).
- **Navegación fuera del inicio antes de que termine el hero:** las animaciones se interrumpen sin errores ni navegaciones encoladas, y al volver se muestran de nuevo o en su estado final (RF-6, RF-8).
- **Error y elemento de marca rojos en la misma vista:** se distinguen por color y el error lleva además texto o ícono (RF-3).
- **Entorno de tests (jsdom) sin `matchMedia`, `IntersectionObserver` ni `ResizeObserver`:** los componentes renderizan su contenido sin lanzar errores (RNF-9).
- **Sin conexión a internet:** ambas tipografías, íconos y animaciones funcionan igual por ser locales (RNF-2, RF-4).
- **Nombres o descripciones de producto largos:** `Card` y `Badge` envuelven el texto (también en `font-mono`) sin desbordar ni romper la grilla (RNF-3).
- **Foco de teclado sobre un elemento con efecto encima:** el indicador de foco sigue visible y el efecto no captura el clic ni el foco (RF-8, RF-9).
- **Imagen de producto faltante o rota dentro de una `Card`:** el layout no se rompe y se conserva el texto alternativo (002).
- **Vista de una fase posterior aún no adoptada** (p. ej. formularios durante la fase 1): debe seguir funcionando y ser legible sobre el fondo oscuro, aunque no use todavía las primitivas (RF-10).

## Fuera de alcance
- Tema claro y selector de tema.
- Contenido nuevo de las vistas (secciones, textos o funcionalidades nuevas en el inicio u otras páginas, incluido el contenido concreto del hero de terminal): requiere la spec de la vista.
- Precios en los datos: RF-4 solo fija su tipografía; añadirlos exige cambiar el formato del JSON en otra spec.
- Componentes animados fuera de la lista de RF-9 y cualquier componente con WebGL, three.js o canvas 3D.
- Linter y formatter, y cambios al contenido de `npm run check`.
- Migración de los imports relativos existentes al alias `@/`.
- Backend, API, base de datos, persistencia en el navegador, autenticación real, carrito, checkout y pagos.
- Corrección de las incoherencias documentales registradas como pendientes en las dudas abiertas.
- Despliegue y entorno de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. La hoja de estilos global expone los tokens semánticos derivados del azul y el rojo institucionales ajustados, y ningún componente usa colores literales ni paletas por defecto (RF-1).
2. La tienda se muestra siempre en el tema oscuro, sin flash claro, con la variante `dark:` siempre activa y sin selector de tema ni almacenamiento en el navegador (RF-2).
3. `destructive` es un token propio, distinguible de `accent`, y los errores no se comunican solo con color (RF-3).
4. JetBrains Mono (títulos, precios, hero de terminal, acentos) e Inter (texto largo) se cargan localmente mediante `font-mono` y `font-sans` (RF-4).
5. Existen los tokens de radio, sombra y movimiento (150/250/400 ms), y las animaciones los respetan (RF-5).
6. Los efectos de texto pueden superar 400 ms, el hero termina en menos de 2 s y, con movimiento reducido, el texto aparece completo sin animación (RF-6).
7. Existen las primitivas `Button`, `Card`, `Badge`, `Input`, `Label` y `ToggleGroup`/`Toggle` con sus variantes (RF-7).
8. El foco es visible con el token `ring` y, con `prefers-reduced-motion: reduce`, ninguna animación se mueve y todo sigue operable (RF-8).
9. Solo se usan componentes animados de la lista cerrada, verificados sin dependencias adicionales (RF-9).
10. Las cuatro fases están completas, empezando por el inicio; los requisitos de 001–003 se conservan o están sancionados por una spec, y los tests están alineados (RF-10).
11. Solo se agregaron las dependencias de RNF-6, la estructura de carpetas es la actual y el código generado compila con el `tsconfig` actual (RNF-6, RNF-7).
12. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Ubicación e id: `specs/000-design-system/spec.md`, como base transversal previa a 001–003.
- [RESUELTO] Alcance: todas las vistas, en fases y empezando por el inicio. Se puede reemplazar toda la presentación; los cambios funcionales se sancionan en la spec de cada vista (RF-10).
- [RESUELTO] Las librerías no son obligatorias. Los componentes animados se limitan a una lista cerrada que depende solo de `motion` (RF-9). Se excluyen `magic-card` (requiere `next-themes`) y `FadeContent` de React Bits (requiere `gsap`).
- [RESUELTO] Incorporación con la CLI (shadcn/ui y los registros de Magic UI y React Bits), en variante TypeScript + Tailwind.
- [RESUELTO] Se mantiene la estructura actual de carpetas. Los archivos generados van a `components/` en PascalCase, `cn` va a `logic/` y `@/` existe solo porque lo exige la CLI (RNF-7).
- [RESUELTO] El código generado que no compile se ajusta, sin relajar el `tsconfig` (RNF-7).
- [RESUELTO] No se agrega linter (RNF-8).
- [RESUELTO] Se respeta siempre `prefers-reduced-motion` y no se usan componentes con WebGL ni three.js (RF-8, RF-9, RNF-5).
- [RESUELTO] Tipografía: dos familias variables locales, `@fontsource-variable/jetbrains-mono` (títulos, precios, hero de terminal y acentos) y `@fontsource-variable/inter` (texto largo); ambos paquetes aprobados (RF-4, RNF-6).
- [RESUELTO] Paleta: se mantienen el azul y el rojo institucionales, con valores ajustados para contraste AA. El error usa un token `destructive` propio, distinguible del rojo de marca (RF-1, RF-3). Los valores exactos se fijan en el plan.
- [RESUELTO] Tema: solo modo oscuro, sin selector de tema y sin `localStorage`, respetando la ausencia de persistencia de 001–003 (RF-2, RNF-2).
- [RESUELTO] Duraciones de 150, 250 y 400 ms. Los efectos de texto (terminal, `DecryptedText`) pueden durar más, pero el hero completo termina en menos de 2 s; con movimiento reducido el texto aparece completo sin animación (RF-5, RF-6).
- [PENDIENTE — fuera de esta spec] La regla de `AGENTS.md` cita `specs/00-design-system/spec.md`; debe apuntar a `specs/000-design-system/spec.md`.
- [PENDIENTE — fuera de esta spec] Incoherencia de stack: la constitución §1 menciona **Hono** como backend, mientras que `AGENTS.md`, `README.md` y la skill `generar-spec` mencionan **Express**. El equipo debe unificarlo aparte.
- [PENDIENTE — fuera de esta spec] La tarea 17 de `specs/001-tiendaDCC/tasks.md` dice que `npm run check` ejecuta "tipos + tests + build", pero solo ejecuta `tsc --noEmit && vitest run`; el build es `npm run build`. El equipo debe corregir la tarea o el comando aparte.
