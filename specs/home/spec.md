# Spec home — Página de inicio "IDE institucional"

> **Base obligatoria.** Esta spec aplica `specs/00-design-system/spec.md` (en adelante, **DS**) a la página de inicio y corresponde a su **fase 1** (DS, RF-11). Los tokens, la tipografía, la escala de movimiento, el comportamiento con movimiento reducido, las primitivas, los componentes animados permitidos, las dependencias, la ubicación del código de terceros y las restricciones técnicas se definen allí y **no se repiten aquí**. Solo se usan componentes y dependencias aprobados en DS (RF-9, RF-10, RNF-6); esta spec no agrega dependencias.

## Contexto y objetivo
Hoy la página de inicio (`/`) muestra:
- un héroe con el título "TiendaDCC", la descripción "Venta de productos del DCC." y los botones "Registrarse ahora", "Iniciar sesión" y "Ver Catálogo";
- una grilla con los 3 primeros productos de `products.json`;
- un botón "Ver más productos".

Todo esto quedó definido en 001 (RF-1, RF-6) y 003 (RF-1), con estilo genérico.

Esta spec rediseña la página de inicio con la dirección "IDE institucional" de DS para que se sienta hecha por y para informáticos. La página tendrá:
- un **hero de terminal** que escribe un comando y revela el título con un glitch sutil;
- los **productos destacados** con entrada escalonada;
- **accesos rápidos a categorías** con estética de flags de línea de comandos;
- un **footer** con información del DCC;
- una barra superior con los accesos activos y los **futuros accesos deshabilitados** (carrito, favoritos, perfil y páginas informativas), marcados como "próximamente".

Los destacados dejan de ser "los 3 primeros" y pasan a definirse con un campo `featured` en el modelo. Se obtienen mediante una **función de acceso a datos asíncrona** que hoy lee `products.json` y mañana podrá reemplazarse por `GET /api/products?featured=true` sin cambiar la página. Por eso la sección tiene estados de carga, error y vacío.

Sigue sin haber backend, red ni persistencia. Esta spec **enmienda** de forma explícita algunos criterios de 001 y 003 (ver "Enmiendas a specs anteriores").

## Usuarios
- **Visitante / comprador potencial**: estudiante, docente o funcionario del DCC (u otra persona) que entra a la tienda. Quiere entender rápido qué se vende, ver los destacados e ir al catálogo, a una categoría, al detalle de un producto o a registrarse o iniciar sesión.
- **Desarrollador /s**: (implícito) quien implementa la página y, más adelante, conecta la función de acceso a datos con la API.

## Historias de usuario
- Como visitante, quiero que al entrar la página me reciba con una terminal que "instala" la tienda, para reconocer de inmediato una estética cercana a mis herramientas.
- Como visitante, quiero ver los productos destacados y abrir el detalle de uno, para conocerlo sin pasar por el catálogo.
- Como visitante, quiero saltar directo a una categoría (Tazas, Poleras, Stickers), para filtrar sin pasos extra.
- Como visitante, quiero ir al catálogo completo, al registro o al inicio de sesión desde el inicio, para seguir mi recorrido.
- Como visitante, quiero ver qué secciones vendrán (carrito, favoritos, perfil, páginas informativas) sin poder entrar aún, para saber qué esperar.
- Como visitante, quiero un mensaje claro si los destacados están cargando, fallan o no existen, para no quedarme ante una sección vacía.
- Como visitante que usa teclado o prefiere movimiento reducido, quiero usar toda la página sin mouse y sin animaciones, para acceder en igualdad de condiciones.

## Requisitos funcionales

**RF-1 — Barra superior con accesos activos y "próximamente".**
Cuando el usuario esté en la página de inicio, el sistema deberá mostrar una barra superior con el logo "TiendaDCC" y el acceso "Catálogo". También deberá mostrar los accesos "Favoritos", "Carrito" y "Perfil", definidos pero deshabilitados y marcados como "próximamente".
Criterios de aceptación:
- Cuando la página cargue, deberá mostrarse el logo "TiendaDCC" como enlace a `/`, con nombre accesible "TiendaDCC". El prompt decorativo que lo acompañe (p. ej. `>_`) deberá estar oculto a tecnologías de asistencia.
- Cuando el usuario active "Catálogo", deberá presentarse la vista de catálogo sin recargar el sitio.
- Cuando la página cargue, deberán mostrarse "Favoritos", "Carrito" y "Perfil", cada uno con `aria-disabled="true"`, una marca visible "próximamente" y nombre accesible que la incluya (p. ej. "Carrito (próximamente)").
- Cuando el usuario active un acceso "próximamente" con clic, Enter o Espacio, no deberá navegarse a ninguna vista ni cambiar la URL.
- Cuando el usuario recorra la barra con Tab, los accesos "próximamente" deberán seguir siendo alcanzables por teclado, para que su estado se pueda descubrir.

**RF-2 — Hero de terminal.**
Cuando la página de inicio cargue, el sistema deberá mostrar un hero con dos piezas separadas:
- el `h1` "TiendaDCC", revelado mediante `DecryptedText`;
- una ventana de terminal **decorativa** (`terminal` + `typing-animation` de Magic UI, con `border-beam` de una sola pasada) que escribe un comando y dos líneas de salida.

Criterios de aceptación:
- Cuando la página cargue, deberá existir un único `h1` con nombre accesible exactamente "TiendaDCC", fuera de la ventana de terminal y disponible desde el primer render aunque la animación de revelado esté en curso.
- Cuando la página cargue, deberá mostrarse la descripción "Venta de productos del DCC." en `font-sans`, fuera de la terminal y accesible.
- Cuando la página cargue, la terminal deberá mostrar exactamente estas tres líneas, en este orden:
  ```
  $ ./tiendadcc --start
  Hola, mundo.
  Compila tu estilo: tazas, poleras y stickers.
  ```
  El `$` deberá usar el token `terminal-prompt`; el resto, los tokens de texto de DS.
- Cuando se inspeccione la ventana de terminal, su contenedor deberá tener `aria-hidden="true"` y no deberá contener elementos focables. Es decoración según DS, RF-10: el contenido significativo del hero lo aportan el `h1` y la descripción.
- Cuando la página cargue, todas las animaciones del hero (revelado del título, escritura del comando, aparición de las dos líneas de salida y `border-beam`) deberán terminar antes de 2 s desde el primer render, según una línea de tiempo definida como función pura y testeada (RF-10). Después, el cursor deberá quedar visible y estático.
- Cuando la preferencia `prefers-reduced-motion: reduce` esté activa, el título y las tres líneas de la terminal deberán mostrarse completos desde el primer render, sin cifrado, escritura, cursor parpadeante ni `border-beam` (DS, RF-8).
- Cuando la página cargue, el hero deberá mostrar los accesos "Ver Catálogo", "Registrarse ahora" e "Iniciar sesión" (RF-3).

**RF-3 — Accesos principales.**
Cuando el usuario active un acceso principal del inicio, el sistema deberá navegar a la vista correspondiente sin recargar el sitio.
Criterios de aceptación:
- Cuando el usuario active "Ver Catálogo" o "Ver más productos", deberá presentarse `/catalogo`.
- Cuando el usuario active "Registrarse ahora", deberá presentarse `/registro`; cuando active "Iniciar sesión", deberá presentarse `/iniciar-sesion`.
- Cuando se inspeccionen estos accesos, deberán ser enlaces (rol `link`) renderizados con la primitiva `Button` como `Link` de `react-router-dom` (DS, RF-9, RF-12).
- Cuando la página cargue, "Registrarse ahora" deberá usar la variante `brand` (rojo de marca), y "Ver Catálogo" e "Iniciar sesión" variantes secundarias (`outline` o `secondary`).

**RF-4 — Productos destacados.**
Cuando la página de inicio cargue, el sistema deberá mostrar la sección "Destacados" con los productos destacados obtenidos de la función de acceso a datos (RF-7), usando `ProductCard` (adaptada a la primitiva `Card` en esta fase) y seguida del acceso "Ver más productos".
Criterios de aceptación:
- Cuando la carga termine con éxito, deberá mostrarse un `h2` "Destacados" y una `ProductCard` por cada destacado, en el orden recibido y como máximo 3.
- Cuando el usuario active una tarjeta destacada, deberá presentarse `/producto/<id>` de ese producto sin recargar el sitio (002, RF-1).
- Cuando las tarjetas aparezcan en pantalla, deberán entrar con `blur-fade` escalonado. Cada tarjeta deberá durar `--duration-base` (250 ms) y tener un retardo de `índice × --duration-fast` (0, 150 y 300 ms). La entrada deberá ocurrir una sola vez.
- Cuando la preferencia de movimiento reducido esté activa, las tarjetas deberán mostrarse en su estado final sin desenfoque, desplazamiento ni retardo.
- Cuando cada tarjeta se muestre, su imagen deberá tener texto alternativo igual al nombre del producto, la categoría deberá mostrarse como `Badge` en `font-mono` y la descripción en `font-sans`.

**RF-5 — Estados de la sección de destacados.**
Mientras la función de acceso a datos no haya respondido, falle o devuelva una lista vacía, el sistema deberá mostrar el estado correspondiente en lugar de la grilla, manteniendo visibles el título "Destacados" y el resto de la página.
Criterios de aceptación:
- Cuando la carga esté en curso, deberá mostrarse "Cargando productos destacados…" dentro de una región con `role="status"`, y ninguna tarjeta.
- Cuando la carga falle (promesa rechazada o datos que no pasan la validación Zod), deberá mostrarse "No pudimos cargar los productos destacados." dentro de una región con `role="alert"`, junto con un ícono de alerta (`lucide-react`, oculto a tecnologías de asistencia) y un botón "Reintentar".
- Cuando se muestre el estado de error, su texto, ícono y borde deberán usar el token `destructive` (ámbar), nunca `brand-red` ni `terminal-prompt` (DS, RF-3).
- Cuando el usuario active "Reintentar", deberá volver a invocarse la función de acceso a datos y mostrarse de nuevo el estado de carga.
- Cuando la carga termine con una lista vacía, deberá mostrarse "Aún no hay productos destacados." y un enlace "Ver catálogo completo" a `/catalogo`.
- Cuando se muestre cualquiera de los tres estados, el acceso "Ver más productos" deberá seguir visible.

**RF-6 — Accesos rápidos a categorías y filtro sincronizado con la URL.**
Cuando la página de inicio cargue, el sistema deberá mostrar la sección "Categorías" con un acceso por categoría (Tazas, Poleras, Stickers), presentado como un flag de línea de comandos. Cada acceso llevará al catálogo con esa categoría seleccionada.

En el catálogo, el filtro activo se refleja en el parámetro `categoria` de la URL:
- se valida con Zod mediante una función pura de `logic/`;
- se actualiza al cambiar de filtro sin agregar entradas al historial;
- se elimina al elegir "Todas".

Criterios de aceptación:
- Cuando la página cargue, deberá mostrarse un `h2` "Categorías" y tres enlaces con nombre accesible "Tazas", "Poleras" y "Stickers".
- Cuando se muestre cada acceso, deberá incluir en `font-mono` un fragmento decorativo de comando (p. ej. `$ tiendadcc --categoria=tazas`) oculto a tecnologías de asistencia, además del nombre visible de la categoría.
- Cuando el usuario active un acceso, deberá presentarse `/catalogo?categoria=<slug>` sin recargar el sitio. El slug es el nombre de la categoría en minúsculas y sin tildes (p. ej. `tazas`).
- Cuando el catálogo lea el parámetro `categoria`, deberá validarlo con una función pura de `logic/` que use un esquema Zod. La función recibe el valor crudo (`string | null`) y las categorías existentes, y devuelve la categoría correspondiente o `null` ("Todas").
- Cuando el catálogo se abra con `?categoria=<slug>` que corresponda a una categoría existente, el filtro activo deberá ser esa categoría, con su control marcado como presionado.
- Cuando el catálogo se abra sin `categoria`, o con un valor vacío, desconocido o malformado, deberán mostrarse todos los productos con el filtro "Todas" activo, sin mensajes de error.
- Cuando el usuario elija una categoría dentro del catálogo, el parámetro `categoria` deberá actualizarse a su slug mediante `setSearchParams` con `replace: true`, sin agregar entradas al historial del navegador.
- Cuando el usuario elija "Todas" dentro del catálogo, el parámetro `categoria` deberá eliminarse de la URL, también con `replace: true`.
- Cuando el usuario cambie varias veces de filtro y luego use "atrás" del navegador, deberá volver a la vista anterior al catálogo, no a un filtro anterior.
- Cuando el usuario recargue (F5) el catálogo, deberá mantenerse el filtro presente en la URL.

**RF-7 — Acceso a datos de destacados.**
El sistema deberá obtener los destacados mediante una función de acceso a datos asíncrona (`fetchFeaturedProducts(): Promise<Product[]>`). Hoy la función resuelve desde `products.json` y su contrato equivale a `GET /api/products?featured=true`, de modo que pueda reemplazarse sin cambiar la página.
Criterios de aceptación:
- Cuando se invoque la función, deberá devolver una promesa con los productos cuyo `featured` sea `true`, en el orden de `products.json` y como máximo `FEATURED_PRODUCT_COUNT` (3).
- Cuando los datos de origen no pasen la validación del esquema Zod de producto, la promesa deberá rechazarse (lo que activa el estado de error de RF-5).
- Cuando la página consuma los datos, deberá hacerlo mediante un hook que exponga un estado discriminado (`loading` | `error` | `success`) y una acción de reintento, sin conocer el origen de los datos.
- Cuando se reemplace la implementación por la llamada a la API, la página y el hook no deberán requerir cambios. La respuesta de la API deberá validarse con el mismo esquema Zod.
- Cuando se ejecute la página en esta fase, no deberá realizarse ninguna llamada de red.

**RF-8 — Criterio de destacado y cambio de modelo.**
Un producto es destacado si su campo `featured` es `true`. El modelo de producto suma el campo booleano obligatorio `featured`.
Criterios de aceptación:
- Cuando se valide un producto, el esquema Zod deberá exigir `featured` de tipo booleano y rechazar productos sin él o con otro tipo.
- Cuando se inspeccione `products.json`, cada producto deberá declarar `featured`; `taza-dcc`, `polera-dcc` y `sticker-dcc` deberán tener `featured: true`.
- Cuando se aplique este cambio de modelo, deberán actualizarse en la misma tarea:
  - el esquema Zod de producto, en su ubicación actual `apps/frontend/client/src/logic/productParse.ts` (el traslado a `utils/` está bloqueado; ver dudas abiertas);
  - `products.json`;
  - los tests de `productParse`, `productLookup` y `productFilter`, y los datos de prueba con tipo `Product` (`ProductGrid.test.tsx`).
- Cuando se implemente `fetchFeaturedProducts`, la función `getFeaturedProducts(products, count)` de 003 deberá reemplazarse por la selección por `featured`. La constante `FEATURED_PRODUCT_COUNT = 3` se conserva como tope de visualización.

**RF-9 — Footer con proyecto, DCC, curso y año.**
Cuando la página de inicio cargue, el sistema deberá mostrar un footer con:
- el nombre del proyecto;
- un enlace al sitio del DCC;
- el curso y el año;
- los accesos a páginas informativas, definidos pero deshabilitados y marcados como "próximamente".

El footer no incluye correo.
Criterios de aceptación:
- Cuando la página cargue, deberá existir un `<footer>` (landmark `contentinfo`) con el nombre del proyecto "TiendaDCC" en `font-mono`.
- Cuando la página cargue, el footer deberá mostrar un enlace con texto visible "Departamento de Ciencias de la Computación (DCC)" a `https://www.dcc.uchile.cl`. Deberá tener `target="_blank"` y `rel="noopener noreferrer"`, y un nombre accesible que indique "(se abre en una pestaña nueva)".
- Cuando la página cargue, el footer deberá mostrar el curso y el año: "Proyecto del curso CC5003 — Aplicaciones Web Reactivas, 2026".
- Cuando se inspeccione el footer, no deberá contener direcciones de correo ni enlaces `mailto:`.
- Cuando la página cargue, el footer deberá mostrar "Sobre la tienda", "Envíos y retiro", "Preguntas frecuentes" y "Contacto". Cada uno deberá tener `aria-disabled="true"`, una marca visible "próximamente" y nombre accesible que la incluya, sin navegar al activarse (como en RF-1).
- Cuando el footer use prefijos de sintaxis (p. ej. `//`), deberán estar ocultos a tecnologías de asistencia.

**RF-10 — Línea de tiempo del hero.**
El sistema deberá definir la secuencia del hero como función o constante pura que derive retardos y duraciones de los tokens de movimiento de DS (RF-6). La secuencia de referencia es:

| Paso | Inicio | Fin |
|---|---|---|
| Revelado del título (`DecryptedText`) | 0 ms | ≤ 700 ms |
| Escritura de `$ ./tiendadcc --start` (`typing-animation`) | 200 ms | ≤ 1100 ms |
| Aparición de "Hola, mundo." (`blur-fade`, 250 ms) | ≥ 1100 ms | ≤ 1350 ms |
| Aparición de "Compila tu estilo: tazas, poleras y stickers." (`blur-fade`, 250 ms) | ≥ 1350 ms | ≤ 1600 ms |
| Pasada única de `border-beam` | 0 ms | ≤ 1800 ms |

Criterios de aceptación:
- Cuando se evalúe la línea de tiempo, el fin del último paso deberá ser menor que 2000 ms, y un test unitario deberá verificarlo.
- Cuando se evalúe la línea de tiempo, la escritura del comando deberá terminar antes de que empiece la primera línea de salida, y cada línea de salida deberá empezar al terminar la anterior.
- Cuando cambie el texto del comando o de la salida, la velocidad de escritura deberá derivarse para mantener el fin bajo 2000 ms, sin truncar el texto.

## Enmiendas a specs anteriores
Esta spec reemplaza, a partir de su aprobación, los siguientes puntos (los archivos de 001–003 no se editan):
- **001, RF-1 y RF-2/RF-3; 003, RF-1:** "Registrarse ahora", "Iniciar sesión", "Ver Catálogo" y "Ver más productos" pasan de botones a **enlaces** (rol `link`), con los mismos textos y destinos.
- **001, RF-7:** el logo "TiendaDCC" de la barra superior pasa de botón a **enlace** a `/`, con el mismo nombre accesible.
- **001, RF-6; 003, RF-1 ("principales = los 3 primeros"):** los destacados son los productos con `featured: true` (máximo 3) y se cargan de forma asíncrona.
- **003, RF-3 (filtro como estado local, inicial "Todas") y RF-6 (recarga reinicia a "Todas"):** el filtro activo se refleja en `?categoria=<slug>`. Se valida con Zod; si es inválido o no existe, se muestra "Todas". Al cambiar de filtro se actualiza con `setSearchParams` y `replace: true`, y al elegir "Todas" se elimina. La recarga conserva el filtro presente en la URL (RF-6).
- **003, Fuera de alcance ("filtros persistentes en la URL o compartibles por enlace"):** queda habilitado para el parámetro `categoria`.
- **Modelo de datos (001–003, "sin cambios al formato del JSON"):** se agrega `featured` (RF-8).

Las enmiendas quedan registradas con una nota "Enmendado por `specs/home/spec.md`" al inicio de las specs 001 y 003.

Los tests existentes afectados deberán actualizarse a esta spec en la misma tarea:
- `App.test.tsx`: las búsquedas `getByRole("button", …)` de los accesos convertidos en enlaces ("Registrarse ahora", "Iniciar sesión", "Ver Catálogo", "Ver más productos" y el logo "TiendaDCC") deberán pasar a `getByRole("link", …)`. Ninguna aserción existente deberá eliminarse. Las que dependan de la carga asíncrona de destacados deberán esperar con `findBy*`.
- `ProductGrid.test.tsx`: los datos de prueba deberán incluir `featured`.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todos los textos visibles y nombres accesibles van en español (constitución, §6), incluidas las líneas de salida de la terminal. Los comandos (`./tiendadcc --start`, `--categoria=`) se consideran sintaxis, no texto de interfaz.
- **RNF-2 Sin red ni persistencia.** No se realizan llamadas de red ni se usa `localStorage`, `sessionStorage` o cookies. La función de acceso a datos resuelve localmente en esta fase (DS, RNF-2).
- **RNF-3 Responsividad.** Breakpoints de Tailwind:
  - **Móvil (< 640 px):** una columna; la ventana de terminal ocupa el ancho disponible y sus líneas se envuelven sin desplazamiento horizontal; los accesos del hero se apilan; la barra superior muestra los accesos "próximamente" como íconos con nombre accesible y marca visible abreviada.
  - **Tablet (640–1023 px):** destacados en 2 columnas; categorías en 3 columnas; accesos del hero en fila con ajuste.
  - **Escritorio (≥ 1024 px):** destacados en 3 columnas; contenido limitado a un ancho máximo centrado.
  - Desde 360 px de ancho, no deberá haber desplazamiento horizontal en ninguna sección.
- **RNF-4 Accesibilidad.**
  - **Jerarquía:** un único `h1` ("TiendaDCC") y un `h2` por sección ("Destacados", "Categorías").
  - **Landmarks:** `header`, `nav`, `main` y `footer`.
  - **Teclado:** el primer elemento focable es un enlace "Saltar al contenido" que lleva a `main`; todo es operable por teclado en un orden de foco que sigue el orden visual; el foco es visible con el token `ring` (DS, RF-9).
  - **Contenido:** las imágenes tienen texto alternativo; todo fragmento decorativo de sintaxis (`$`, `✓`, `//`, `--`, `>_`) está oculto a tecnologías de asistencia; ningún estado depende solo del color.
  - **Movimiento reducido:** obligatorio según DS, RF-8.
- **RNF-5 Desempeño.** El hero no depende de la carga de destacados: se renderiza y anima aunque los datos estén en carga o fallen. La navegación es inmediata, sin recarga completa.
- **RNF-6 Dependencias.** No se agregan dependencias: solo las aprobadas en DS, RNF-6, más `react-router-dom` (003) para `Link`, `useNavigate` y `useSearchParams`.
- **RNF-7 Tests.** Tienen tests unitarios obligatorios (constitución, §4):
  - `fetchFeaturedProducts`: filtra por `featured`, respeta orden y tope, y rechaza datos inválidos;
  - el hook de estado: `loading` → `success`, `loading` → `error` y reintento;
  - las funciones de slug de categoría: nombre → slug;
  - la función de validación Zod del parámetro `categoria`: slug válido → categoría existente; `null`, vacío, desconocido, en mayúsculas, con espacios o con caracteres no permitidos → `null` ("Todas");
  - la línea de tiempo del hero: fin < 2000 ms;
  - el esquema con `featured`.

  Tienen tests de render obligatorios:
  - los tres estados de RF-5, usando una función de acceso a datos sustituida en el test;
  - el hero con movimiento reducido simulado (texto completo en el primer render; DS, RNF-8);
  - los accesos "próximamente" (no navegan);
  - `?categoria=tazas` en el catálogo (filtro "Tazas" presionado);
  - `?categoria=gorros` en el catálogo (todos los productos, "Todas" presionado);
  - sincronización del filtro: elegir "Tazas" deja la ubicación en `/catalogo?categoria=tazas`, elegir "Todas" la deja en `/catalogo` y "atrás" vuelve a la vista previa al catálogo.

  `npm run check` deberá pasar.

## Casos límite
- **Destacados que resuelven al instante (datos locales):** el estado de carga puede durar un solo render; no debe producir errores ni saltos de layout que muevan el foco.
- **Más de 3 productos con `featured: true`:** se muestran solo los 3 primeros en orden de `products.json` (RF-7).
- **Ningún producto con `featured: true`:** se muestra el estado vacío con "Ver catálogo completo" (RF-5).
- **`products.json` con un producto sin `featured` o con un tipo incorrecto:** la validación Zod falla y se muestra el estado de error; "Reintentar" vuelve a fallar sin romper la página (RF-5, RF-8).
- **Clics repetidos en "Reintentar" durante una carga:** no se encolan cargas paralelas; prevalece una sola carga en curso.
- **Imagen de un destacado faltante:** la tarjeta conserva su layout y el texto alternativo (002).
- **`?categoria=TAZAS`, `?categoria=tazas%20`, `?categoria=` o `?categoria=gorros`:** el esquema Zod acepta solo el slug exacto en minúsculas de una categoría existente; en otro caso se muestran todos los productos con "Todas" activo. El valor inválido permanece en la URL hasta que el usuario elija un filtro (RF-6).
- **Parámetro `categoria` repetido (`?categoria=tazas&categoria=poleras`):** se usa el primer valor y se valida igual (RF-6).
- **Cambios rápidos y repetidos de filtro:** cada cambio reemplaza la entrada actual del historial; "atrás" sale del catálogo (RF-6).
- **Elegir "Todas" estando ya sin parámetro:** la URL no cambia y no se agrega historial (RF-6).
- **Salida del inicio antes de que termine el hero, y regreso:** las animaciones se interrumpen sin errores y el hero vuelve a reproducirse dentro del presupuesto de 2 s (DS, RF-7).
- **Movimiento reducido activo:** título, terminal y tarjetas aparecen completos y estáticos desde el primer render (RF-2, RF-4).
- **Activación de un acceso "próximamente" con teclado o clic:** no navega, no cambia la URL y no lanza errores (RF-1, RF-9).
- **Pantalla de 360 px con la línea "Compila tu estilo: tazas, poleras y stickers.":** la línea se envuelve dentro de la ventana sin desplazamiento horizontal (RNF-3).
- **Lector de pantalla recorriendo el hero:** anuncia el `h1` "TiendaDCC", la descripción y los accesos, pero no el contenido de la terminal (`aria-hidden="true"`) (RF-2).
- **Activación del enlace al DCC:** se abre en una pestaña nueva sin dar acceso a `window.opener`, y la tienda conserva su estado (RF-9).
- **Recarga (F5) en `/` o acceso directo:** la página se muestra igual; la animación del hero se reproduce de nuevo.

## Fuera de alcance
- Selector de tema y tema claro (DS, RF-4).
- `localStorage`, `sessionStorage` y cualquier persistencia en el navegador.
- ESLint u otro linter (DS, RNF-9).
- Funcionalidad de carrito, favoritos, perfil y páginas informativas: aquí solo existen como accesos deshabilitados "próximamente".
- Backend, endpoint real `GET /api/products?featured=true` y llamadas de red (solo se define el contrato de la función).
- Precios, stock, búsqueda y contadores por categoría.
- Parámetros de URL distintos de `categoria` (búsqueda, orden, paginación).
- Rediseño de catálogo, detalle y formularios (fases 2–4 de DS); del catálogo, esta spec solo toca la lectura y sincronización de `?categoria`.
- Mover el esquema Zod a `utils/`: bloqueado y registrado como pendiente (ver dudas abiertas).
- Despliegue y entorno de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. La barra superior muestra el logo-enlace "TiendaDCC" y "Catálogo" activos, y "Favoritos", "Carrito" y "Perfil" con `aria-disabled="true"` y "próximamente", sin navegar (RF-1).
2. El hero muestra el `h1` "TiendaDCC" revelado con `DecryptedText`, la descripción y, aparte, una terminal decorativa con `aria-hidden="true"` que muestra `$ ./tiendadcc --start`, "Hola, mundo." y "Compila tu estilo: tazas, poleras y stickers.", con el `$` en el token `terminal-prompt` (RF-2).
3. Todas las animaciones del hero terminan antes de 2 s según una línea de tiempo testeada, y el cursor queda estático (RF-2, RF-10).
4. Con `prefers-reduced-motion: reduce`, el título y la terminal aparecen completos desde el primer render y las tarjetas sin animación, verificado por test (RF-2, RF-4).
5. "Ver Catálogo", "Ver más productos", "Registrarse ahora" e "Iniciar sesión" son enlaces que llevan a su vista sin recargar (RF-3).
6. La sección "Destacados" muestra hasta 3 `ProductCard` de productos con `featured: true`, con entrada `blur-fade` escalonada (0/150/300 ms, 250 ms), y cada una lleva a su detalle (RF-4).
7. Los estados de carga, error y vacío muestran sus mensajes en español con `role="status"` o `role="alert"`; el error usa el token `destructive` con ícono y "Reintentar" (RF-5).
8. La sección "Categorías" ofrece "Tazas", "Poleras" y "Stickers" con estética de flags, y cada una abre `/catalogo?categoria=<slug>` con ese filtro presionado. El parámetro se valida con una función pura Zod de `logic/` con tests, y un valor inválido o ausente muestra todos los productos (RF-6).
9. En el catálogo, cambiar de filtro actualiza `categoria` con `setSearchParams` y `replace: true` sin agregar historial, elegir "Todas" elimina el parámetro y la recarga conserva el filtro (RF-6).
10. Los destacados se obtienen con `fetchFeaturedProducts()` vía un hook de estado discriminado, sin llamadas de red y con contrato equivalente a `GET /api/products?featured=true` (RF-7).
11. El modelo incluye `featured: boolean` y están actualizados el esquema Zod, `products.json` y los tests afectados (RF-8).
12. El footer muestra "TiendaDCC", el enlace al DCC (`https://www.dcc.uchile.cl`, pestaña nueva, `rel="noopener noreferrer"`), el curso y el año y las páginas informativas "próximamente", sin correo (RF-9).
13. La página cumple RNF-3 (móvil, tablet, escritorio, sin desplazamiento horizontal desde 360 px) y RNF-4 (jerarquía, landmarks, "Saltar al contenido", foco visible, alternativos, sintaxis decorativa oculta).
14. Solo se usan componentes y dependencias aprobados en DS (RNF-6).
15. En `App.test.tsx`, las búsquedas de los accesos convertidos pasaron de `button` a `link` sin eliminar ninguna aserción, y existen los tests de RNF-7.
16. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Ubicación: `specs/home/spec.md`, porque no existía una carpeta dedicada a la página de inicio (001 cubre inicio y autenticación juntos y no se edita).
- [RESUELTO] Criterio de destacado: campo booleano obligatorio `featured`, en vez de "los 3 primeros". Refleja el contrato de `GET /api/products?featured=true` y conserva el tope de 3.
- [RESUELTO] Enmiendas a 001 y 003 aprobadas y registradas con una nota al inicio de cada spec.
- [RESUELTO] Accesos rápidos a categorías: llevan a `/catalogo?categoria=<slug>`. El parámetro se valida con una función pura Zod de `logic/`, con tests; si es inválido o no existe, se muestran todos los productos.
- [RESUELTO] Sincronización del filtro: al cambiar de filtro en el catálogo, `categoria` se actualiza con `setSearchParams` y `replace: true` (sin historial); "Todas" elimina el parámetro. Tiene tarea propia en `tasks.md`.
- [RESUELTO] En `App.test.tsx`, las búsquedas `button` de los accesos convertidos pasan a `link` sin eliminar aserciones.
- [RESUELTO] Accesos "próximamente": `aria-disabled="true"` y siguen siendo focables (no `disabled`), para que su estado se pueda descubrir con teclado y lector de pantalla.
- [RESUELTO] Los accesos de navegación pasan a ser enlaces (rol `link`) según DS, RF-9; los tests se actualizan.
- [PENDIENTE — bloqueado] Traslado del esquema Zod a `utils/`. Se decidió moverlo como tarea propia, antes de agregar `featured`, dejando `logic/productParse.ts` como reexportación sin cambiar sus tests, siempre que el frontend pudiera importar desde `utils/`.
  - **Verificación (2026-10-03):** el frontend aún no puede importar desde `utils/`:
    - la raíz del repo no tiene `node_modules`, por lo que `zod` no se resuelve desde `utils/` (`MODULE_NOT_FOUND`);
    - el `package.json` raíz no declara `workspaces`, y no hay `pnpm-workspace.yaml` ni `lerna.json`;
    - el cliente no tiene alias hacia `utils/` (sin `paths` en `tsconfig.json` ni `resolve.alias` en `vite.config.ts`);
    - el servidor de desarrollo de Vite solo sirve archivos dentro de `apps/frontend/client` (`server.fs`).
  - **Decisión:** el esquema se mantiene en `apps/frontend/client/src/logic/productParse.ts` y `featured` se agrega ahí.
  - **Para desbloquear:** configurar un workspace npm (o un alias y la dependencia `zod` alcanzable desde `utils/`) y ampliar `server.fs.allow`. Requiere su propia spec; el candidato natural es la spec que introduzca el backend, que también consumirá el esquema.
- [RESUELTO] Footer: nombre del proyecto, enlace al sitio del DCC (`https://www.dcc.uchile.cl`, pestaña nueva, `rel="noopener noreferrer"`), curso y año; sin correo (RF-9). Se asume el nombre del curso "CC5003 — Aplicaciones Web Reactivas" y el año 2026.
- [RESUELTO] Terminal: `$ ./tiendadcc --start` / "Hola, mundo." / "Compila tu estilo: tazas, poleras y stickers.". La terminal es decorativa (`aria-hidden="true"`) y el `h1` va aparte con `DecryptedText` (RF-2, RF-10).
