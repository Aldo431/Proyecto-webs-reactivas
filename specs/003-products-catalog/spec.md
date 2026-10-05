# Spec 003 — Catálogo de productos con filtros por categoría

> **Enmendado por `specs/home/spec.md`.**
> - RF-1: "Ver Catálogo" y "Ver más productos" pasan de botones a enlaces (rol `link`), con los mismos textos y destinos. Los "productos principales" pasan a ser los destacados (`featured: true`, máximo 3) en vez de los 3 primeros; el modelo de producto suma el campo `featured`.
> - RF-3 y RF-6: el filtro activo se refleja en el parámetro `categoria` de la URL (`#/catalogo?categoria=<slug>`).
>   - El valor se valida con Zod; si es inválido o no existe, se muestran todos los productos ("Todas").
>   - Al cambiar de filtro, el parámetro se actualiza con `setSearchParams` y `replace: true`, sin agregar entradas al historial; al elegir "Todas", se elimina.
>   - La recarga conserva el filtro presente en la URL.
> - Fuera de alcance: los "filtros persistentes en la URL o compartibles por enlace" quedan habilitados solo para `categoria`.

> **Aclaración: por qué `react-router-dom` en vez del router propio.** (1) El Lab5 del curso prescribe `react-router-dom@^7` en su propio template (`BrowserRouter`, `Routes`, `useParams`, `Link`): es la arquitectura de referencia de la cátedra para una SPA, no una ocurrencia. (2) La última cátedra (05, comunicación con el servidor) orienta hacia apps cliente↔servidor, donde ruteo y datos van juntos; adoptar la librería ahora (en sabor `HashRouter`, compatible sin backend) deja esa puerta abierta. (3) Con 5 rutas y más en camino, extender el router propio sale más caro que usar la librería; el cambio se sancionó aquí vía excepción RNF-6, igual que 001 hizo con Vitest.

## Contexto y objetivo
Las specs 001 y 002 dejaron una tienda **solo frontend** donde el inicio muestra la grilla completa de productos de ejemplo y cada tarjeta enlaza a su página de detalle. Esta spec agrega una **vista de catálogo**: muestra todos los productos con filtros básicos por categoría (Tazas, Poleras, Stickers). El inicio conserva una sección independiente con los productos principales y suma dos accesos al catálogo: un botón "Ver Catálogo" en la página principal y un botón "Ver más productos" junto a la sección de principales. Sigue sin haber backend, API ni persistencia: se reutilizan `products.json` y la validación Zod. El ruteo migra del router propio (tabla `routeParsers` de 002) a `react-router-dom` con `HashRouter` —sin backend solo el hash funciona tras recarga— y las URLs visibles no cambian (`#/catalogo`, `#/producto/:id`). Esta spec habilita —sin implementarlo— el futuro apartado de "Productos similares" en la vista de detalle (futura mejora, fuera de alcance aquí).

## Usuarios
- **Visitante / comprador potencial**: persona que entra al inicio, ve los productos principales, abre el catálogo completo, filtra por categoría y entra al detalle desde cualquier tarjeta.
- **Desarrollador /s**: (implícito) quien consume la spec para implementar; requiere criterios verificables.

## Historias de usuario
- Como visitante, quiero abrir el catálogo desde el inicio, para ver todos los productos en un solo lugar.
- Como visitante, quiero filtrar el catálogo por categoría, para encontrar más rápido lo que me interesa.
- Como visitante, quiero que el inicio siga mostrando los productos principales, para hacerme una idea rápida sin entrar al catálogo.
- Como visitante, quiero poder recargar o compartir la URL del catálogo y ver la misma vista, para retomarla después.

## Requisitos funcionales

**RF-1 — Accesos al catálogo desde el inicio.**
Cuando el usuario esté en la página de inicio, el sistema deberá ofrecer el acceso al catálogo mediante un botón "Ver Catálogo" en la página principal y un botón "Ver más productos" junto a la sección de productos principales.
Criterios de aceptación:
- Cuando la página principal se cargue, deberá mostrarse un botón "Ver Catálogo".
- Cuando la sección de productos principales se muestre, deberá mostrarse un botón "Ver más productos".
- Cuando el usuario active "Ver Catálogo" o "Ver más productos", deberá presentarse la vista de catálogo sin recargar el sitio.
- Cuando el usuario active cualquiera de esos accesos, no deberá abrirse ninguna otra vista.

**RF-2 — Contenido del catálogo.**
Mientras el usuario esté en la vista de catálogo, el sistema deberá mostrar el título, los filtros por categoría y una tarjeta por cada producto del catálogo.
Criterios de aceptación:
- Cuando el catálogo se cargue, deberá mostrarse el título "Catálogo".
- Cuando el catálogo se cargue, deberán mostrarse los filtros: "Todas" más uno por cada categoría presente en los datos.
- Cuando el catálogo se cargue, deberá mostrarse una tarjeta por cada producto, cada una enlazando a su página de detalle (según RF-1 de 002).
- Cuando el catálogo se cargue, deberán mostrarse el logo "TiendaDCC" y un control "Volver al inicio".

**RF-3 — Filtros por categoría.**
Cuando el usuario elija un filtro, el sistema deberá mostrar solo los productos de esa categoría, sin recargar el sitio.
Criterios de aceptación:
- Cuando el catálogo se cargue, el filtro activo deberá ser "Todas" y deberán mostrarse todos los productos.
- Cuando el usuario active una categoría, deberán mostrarse solo los productos de esa categoría sin recargar el sitio.
- Cuando una categoría esté activa, su control deberá indicarlo como presionado y seguir siendo operable mediante teclado.
- Cuando el usuario vuelva a activar "Todas", deberán mostrarse todos los productos de nuevo.
- Cuando los datos contengan una categoría nueva, deberá aparecer su filtro sin cambios de código.

**RF-4 — Categoría sin productos.**
Cuando la categoría activa no tenga productos, el sistema deberá mostrar un mensaje en español manteniendo visibles los filtros y los accesos de regreso, sin tarjetas.
Criterios de aceptación:
- Cuando la categoría activa no tenga productos, deberá mostrarse el mensaje "No hay productos en esta categoría.".
- Cuando la categoría activa no tenga productos, deberán seguir visibles los filtros y el regreso al inicio.
- Cuando la categoría activa no tenga productos, no deberá mostrarse ninguna tarjeta.

**RF-5 — Regreso al inicio desde el catálogo.**
Cuando el usuario esté en el catálogo, el sistema deberá ofrecer el regreso al inicio mediante el botón "Volver al inicio" y mediante el logo "TiendaDCC".
Criterios de aceptación:
- Cuando el usuario active "Volver al inicio" desde el catálogo, deberá presentarse la página de inicio.
- Cuando el usuario active el logo "TiendaDCC" desde el catálogo, deberá presentarse la página de inicio.

**RF-6 — Acceso directo por URL y recarga.**
Cuando el usuario acceda directamente por URL al catálogo o recargue la página, el sistema deberá mostrar la vista de catálogo sin errores, con el filtro reiniciado a "Todas" (el filtro es estado local, no persiste en la URL).
Criterios de aceptación:
- Cuando el usuario acceda por URL a `#/catalogo`, deberá mostrarse la vista de catálogo con todos los productos.
- Cuando el usuario recargue (F5) el catálogo, deberá mantenerse en la vista de catálogo.
- Cuando el usuario recargue el catálogo con un filtro activo, deberá mostrarse el catálogo con el filtro reiniciado a "Todas".
- Cuando el usuario use atrás/adelante del navegador entre inicio, catálogo y detalle, deberá mostrarse la vista correspondiente sin recarga completa del sitio.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final deberá estar en español (constitución, §6).
- **RNF-2 Sin backend ni persistencia.** El sistema no deberá realizar llamadas de red, no deberá consultar ni persistir datos, y no deberá requerir backend para su funcionamiento (igual que 001 y 002).
- **RNF-3 Responsividad.** Cuando el catálogo se visualice en móvil, los filtros deberán envolverse sin romper el layout y la grilla deberá apilarse en una columna; en escritorio la grilla podrá usar varias columnas.
- **RNF-4 Accesibilidad.** Cada filtro deberá ser un botón focable con nombre igual a su categoría e indicación de presionado; las tarjetas conservan lo exigido en 002 (enlace focable, imagen con texto alternativo); todo deberá ser operable mediante teclado.
- **RNF-5 Desempeño.** Cuando el usuario navegue entre inicio, catálogo y detalle o cambie de filtro, la transición deberá ser inmediata, sin recarga completa del sitio.
- **RNF-6 Dependencias.** No se deben agregar dependencias fuera del stack definido (constitución, §1), con dos excepciones sancionadas: las dependencias de desarrollo de tests de 001 (Vitest, jsdom y @testing-library/react) y, desde esta spec, `react-router-dom@^7` (solo `HashRouter`) como dependencia de producción para el ruteo —misma librería y versión mayor que prescribe el Lab5 del curso—.
- **RNF-7 Tests.** Toda lógica de negocio nueva (ruta de catálogo, categorías derivadas, filtrado) deberá tener tests; `npm run check` deberá pasar antes de dar por terminada la tarea (constitución, §4).

## Casos límite
- Acceso directo (URL) o recarga en el catálogo: la vista debe mostrarse igualmente sin errores (cubierto por RF-6).
- Recarga con un filtro activo: el filtro se reinicia a "Todas" por ser estado local (RF-6).
- Catálogo con exactamente un producto: la grilla y los filtros deben funcionar igual.
- Categoría listada sin productos en los datos: se muestra el estado vacío (RF-4).
- Pulsaciones repetidas sobre el mismo filtro o acceso: no duplican ni encolan acciones.
- Botón atrás del navegador desde el catálogo: vuelve a la vista anterior sin recarga (RF-6).
- Sin conexión a internet: el funcionamiento debe ser idéntico, por ser contenido estático (RNF-2).

## Fuera de alcance
- Apartado de "Productos similares" en el detalle (futura mejora del detalle; esta spec solo la habilita).
- Búsqueda, orden, paginación y contadores por categoría.
- Filtros persistentes en la URL o compartibles por enlace.
- Precio, stock, variantes, carrito, checkout y pagos.
- Backend, API, base de datos (MongoDB/Mongoose) y catálogo dinámico.
- Autenticación real, sesiones y validación de formularios (sigue vigente 001).
- Cambios al formato del JSON de productos (se reutiliza el modelo de 001).
- Despliegue y entorno de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. El inicio muestra "Ver Catálogo" y la sección de principales con "Ver más productos"; ambos llevan al catálogo sin recargar (RF-1).
2. El catálogo muestra el título, los filtros ("Todas" + uno por categoría) y una tarjeta enlazada a su detalle por cada producto, más el logo y "Volver al inicio" (RF-2).
3. "Todas" es el filtro inicial; activar una categoría filtra sin recarga con indicación de presionado; volver a "Todas" restaura todo; una categoría nueva en los datos genera su filtro sola (RF-3).
4. Una categoría sin productos muestra "No hay productos en esta categoría.", sin tarjetas y con filtros y regreso visibles (RF-4).
5. "Volver al inicio" y el logo llevan al inicio desde el catálogo (RF-5).
6. La URL directa y la recarga muestran el catálogo (reiniciando el filtro a "Todas") y atrás/adelante no recarga el sitio (RF-6).
7. Filtros y grilla se adaptan a móvil y escritorio y todo es operable por teclado (RNF-3, RNF-4).
8. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Ruta del catálogo: `#/catalogo` (las URLs visibles no cambian). [Enmienda: la idea original de una entrada `parseCatalogRoute` en la tabla de 002 queda reemplazada por la ruta `/catalogo` de `HashRouter`; ver duda de ruteo más abajo.]
- [RESUELTO] "Productos principales" del inicio = los 3 primeros del catálogo (asumido; con 3 productos hoy equivale a todos; se revisará cuando el catálogo crezca).
- [RESUELTO] Filtros derivados de los datos con "Todas" primero; el filtro es estado local de UI (no va en la URL) y la recarga lo reinicia a "Todas".
- [RESUELTO] Categoría activa indicada como presionado (`aria-pressed`).
- [RESUELTO] Sin contador de resultados en esta fase; tampoco persistencia del filtro en URL (ambos, futuros).
- [RESUELTO] "Productos similares" queda para una futura mejora del detalle; fuera de esta spec.
- [RESUELTO] Ruteo con `react-router-dom@^7` (`HashRouter`): reemplaza el router propio de 001/002 (se eliminan `routeParser`, `useHashRouter`, `ROUTE_*`, `navigate()` y `buildProductRoute`, y sus tests de hash se migran a `MemoryRouter`); alinea con el Lab5 y elimina código propio de matching.
- [RESUELTO] `BrowserRouter` descartado hasta que exista backend con fallback a `index.html`; la migración `HashRouter` → `BrowserRouter` queda anotada como futura (cambia las URLs públicas, requiere plan propio).
