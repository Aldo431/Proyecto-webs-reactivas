# Spec 007 — Pulido del perfil y la navegación

## Contexto y objetivo

La spec 006 quedó implementada y en verde (solo resta su QA manual): perfil en `/perfil` con lectura/edición, favoritos e historial persistidos, carrito sincronizado con fusión por delta, ruta protegida y accesos de Favoritos/Perfil en el encabezado (RF-14). La 005 dejó registro e inicio de sesión con `name`/`email`/`password` y `PublicUser = { id, name, email }`.

Esta spec pule ese resultado sin cambiar su fondo: divide la identidad en `username` (único, editable solo en el perfil y apto como identificador futuro) y `displayName` (visible), convierte el acceso de Perfil en el botón `[DisplayName]`, simplifica el encabezado (fuera "Volver", con menú hamburguesa en móvil), lleva las acciones de carrito y favoritos dentro de `ProductCard`, enriquece favoritos (mini-tarjetas) e historial (carrusel con "cargar anteriores" y fecha) y retira la paginación del historial.

Se redacta como **delta explícito**: cada RF indica si es nuevo o qué RF previo modifica (`modifica 004/RF-3`). La 006 queda congelada como línea base; su QA manual pendiente sigue válida salvo en los comportamientos que esta spec declara supersedidos.

Lo que **NO** incluye: corrección del modo oscuro en botones de productos/catálogo (extra, diferido), recuperación o liberación de `username`, inicio de sesión por `username` (el diseño único lo permite a futuro), avatar, roles, pedidos, pagos ni despliegue.

## Usuarios

- **Usuario autenticado**: persona con sesión activa que se identifica por su `displayName` y gestiona favoritos, historial y carrito con las vistas pulidas.
- **Visitante anónimo**: persona sin sesión que navega catálogo y detalle, y es invitada a iniciar sesión al usar favoritos o perfil.
- **Comprador móvil**: persona que compra desde un celular (menos de 640 px), con navegación colapsada en hamburguesa y acciones siempre visibles sin depender de `hover`.
- **Desarrollador /s**: (implícito) quien implementa el pulido; requiere criterios verificables, esquemas Zod compartidos y tests.

## Historias de usuario

- Como visitante, quiero registrarme con un nombre de usuario único y un nombre a mostrar, para tener identidad y presentación separadas.
- Como usuario autenticado, quiero ver mi `displayName` como acceso a mi perfil en el encabezado, para llegar a él en un clic desde cualquier vista.
- Como usuario autenticado, quiero poder cambiar mi nombre de usuario desde mi perfil, para actualizar mi identidad manteniendo su unicidad.
- Como comprador, quiero un encabezado sin botones redundantes, para navegar sin ruido.
- Como comprador móvil, quiero un menú hamburguesa con la navegación completa, para usar la tienda con una mano.
- Como comprador, quiero agregar al carrito y a favoritos directo desde la tarjeta, para no entrar al detalle cada vez.
- Como usuario autenticado, quiero ver mis favoritos como tarjetas con imagen, precio y eliminación directa, para reconocerlos de un vistazo.
- Como usuario autenticado, quiero recorrer mi historial en un carrusel con fecha y cargar visitas más antiguas, para volver a lo que ya vi.
- Como desarrollador, quiero que cada cambio declare qué RF previo modifica, para no romper la trazabilidad de 004–006.

## Requisitos funcionales

**RF-1 — Identidad: `username` único y editable en el perfil, y `displayName` visible.**
Cuando el sistema gestione usuarios, deberá distinguir `username` (identificador único, editable solo en el perfil y apto para identificar al individuo, incluido un futuro inicio de sesión) de `displayName` (presentación). Modifica 005/RF-1, 005/RF-3, 005/RF-9 y 006/RF-1, 006/RF-3, 006/RF-6.
Criterios de aceptación:
- Cuando se registre un usuario, el esquema compartido deberá exigir `username` (1–80 caracteres tras `trim`, normalizado a minúsculas) y `displayName` (1–80 caracteres tras `trim`, conservando mayúsculas y tildes); los mensajes deberán estar en español.
- Cuando el `username` (sin distinguir mayúsculas) o el correo ya existan, el backend deberá responder `409` en español y no deberá crear usuario.
- Cuando el inicio de sesión ocurra, deberá seguir siendo por correo y contraseña (005 sin cambios en el método).
- Cuando el backend responda con un usuario (registro, login, `GET /api/auth/me`, `GET /api/users/me`), deberá incluir `username` y `displayName` y no deberá exponer `passwordHash`.
- Cuando se edite el perfil (`PUT /api/users/me`), el cuerpo deberá aceptar `username`, `displayName` y correo exigiendo `currentPassword` según 006/RF-3; cuando el nuevo `username` pertenezca a otro usuario (sin distinguir mayúsculas), deberá responder `409` en español sin modificar ningún dato.
- Cuando se edite el perfil, el `username` deberá mostrarse como campo editable (ya no de solo lectura) junto a `displayName` y correo.
- Cuando dos usuarios usen el mismo `displayName`, el sistema deberá aceptarlo sin `409`: el `displayName` es editable pero no necesariamente único (solo el `username` y el correo lo son).
- Cuando existan documentos anteriores a esta spec, deberán adoptar su `name` actual como `username` y `displayName` al serializar.

**RF-2 — Registro con ambos campos.**
Cuando un visitante se registre, el sistema deberá pedir nombre de usuario y nombre a mostrar. Modifica 005/RF-1 y 005/RF-12.
Criterios de aceptación:
- Cuando se muestre el formulario, deberá incluir "Nombre de usuario", "Nombre a mostrar", "Correo electrónico", "Contraseña" y "Confirmar contraseña", funcionales y controlados.
- Cuando los datos sean inválidos, deberán mostrarse los mensajes del esquema compartido en español por campo y no deberá enviarse la petición.
- Cuando el backend responda `409` (correo o `username` duplicado), el frontend deberá mostrar el mensaje en español sin perder los datos ingresados.
- Cuando el registro tenga éxito, el frontend deberá reflejar la sesión y navegar al inicio (`/`) según 005.

**RF-3 — Botón `[DisplayName]` en el encabezado.**
Cuando el usuario vea el encabezado, el sistema deberá mostrar su `displayName` como acceso al perfil. Modifica 006/RF-14 y 005/RF-6.
Criterios de aceptación:
- Cuando haya sesión, el encabezado deberá mostrar un botón con el texto del `displayName` que navegue a `/perfil`, con nombre accesible "Mi perfil".
- Cuando no haya sesión, deberá mostrarse "Perfil" (→ `/iniciar-sesion`) según 006/RF-14, sin cambios.
- Cuando `AuthBar` muestre la identidad en el inicio, deberá mostrar el `displayName` en vez del `name` anterior.
- Cuando el `displayName` cambie en `/perfil`, el encabezado deberá reflejarlo sin recargar.

**RF-4 — Encabezado sin botón "Volver".**
Cuando el usuario vea el encabezado en cualquier vista, el sistema no deberá mostrar el botón "Volver".
Criterios de aceptación:
- Cuando se renderice el encabezado, no deberá existir el botón "Volver" ni la prop `showBackButton`/`backLabel` en ninguna vista (inicio, catálogo, detalle, registro, inicio de sesión, perfil).
- Cuando el usuario quiera volver al inicio, el logo "TiendaDCC" deberá seguir navegando a `/`.
- Cuando se ejecuten los tests existentes, no deberán referenciar `showBackButton`.

**RF-5 — Menú hamburguesa en móvil.**
Cuando el ancho sea menor a 640 px (`sm`), la navegación del encabezado deberá colapsarse en un menú hamburguesa. Nuevo.
Criterios de aceptación:
- Cuando el ancho sea menor a 640 px, deberán verse siempre el logo "TiendaDCC" y el botón del carrito, y el resto de la navegación (Catálogo, Favoritos, `[DisplayName]`/Perfil) deberá ocultarse tras un botón hamburguesa.
- Cuando se active la hamburguesa, deberá abrirse el menú con esos accesos y el botón deberá exponer `aria-expanded="true"` (y `"false"` al cerrar).
- Cuando se elija un acceso, pulse `Escape` o se active el cierre, el menú deberá cerrarse y el foco deberá volver al botón hamburguesa.
- Cuando el ancho sea de 640 px o más, la navegación deberá mostrarse completa como hoy, sin hamburguesa.
- Cuando el menú esté abierto, sus accesos deberán comportarse igual que en escritorio (Favoritos con sesión → sección; anónimo → `/iniciar-sesion`).

**RF-6 — Acciones dentro de `ProductCard`.**
Cuando se muestre una tarjeta de producto, el sistema deberá ofrecer agregar al carrito y a favoritos con íconos visibles sobre la imagen. Modifica 004/RF-3 (supersede el botón textual "Agregar").
Criterios de aceptación:
- Cuando se renderice la tarjeta, sobre la imagen deberá haber un contenedor con fondo de superficie que distinga dos botones de ícono: carrito (`aria-label="Agregar <nombre> al carrito"`) y corazón (`aria-pressed` + `aria-label="Agregar <nombre> a favoritos"` / `"Quitar …"`).
- Cuando el puntero pase por encima (disponible), los íconos deberán reaccionar (énfasis visual en 150 ms); cuando no haya `hover` (táctil), los botones deberán seguir visibles y operables.
- Cuando el producto ya sea favorito del usuario autenticado, el corazón deberá verse relleno (no solo por color).
- Cuando un anónimo active el corazón, deberá redirigirse a `/iniciar-sesion` sin modificar nada (006/RF-10).
- Cuando se active cualquier botón de la tarjeta, no deberá navegarse al detalle y la tarjeta completa deberá seguir enlazando a él sin anidar interactivos.
- Cuando el texto "Agregar" del botón anterior ya no exista, los tests deberán verificar los nombres accesibles de los íconos.

**RF-7 — Favorito textual en el detalle.**
Cuando se muestre el detalle de un producto existente, el sistema deberá ofrecer el favorito con ícono y texto junto al carrito. Modifica 006/RF-10.
Criterios de aceptación:
- Cuando el detalle muestre un producto existente, junto a "Agregar al carrito" deberá haber un botón con corazón y texto "Agregar a favoritos" (o "Quitar de favoritos" si ya lo es), de la misma altura y fila.
- Cuando cambie el estado, el texto y `aria-pressed` deberán actualizarse de inmediato, con error en español si la persistencia falla.
- Cuando el visitante sea anónimo, el botón deberá redirigir a `/iniciar-sesion` según 006/RF-10.

**RF-8 — Favoritos como mini-tarjetas paginadas.**
Cuando el usuario vea sus favoritos en `/perfil`, el sistema deberá mostrarlos como mini-tarjetas alineadas en grilla con paginación. Modifica 006/RF-8 (supersede la lista de enlaces).
Criterios de aceptación:
- Cuando haya favoritos, cada uno deberá mostrarse como mini-tarjeta (imagen, nombre, precio en pesos chilenos y enlace al detalle), más pequeña que la de catálogo, en grilla responsive (1 columna en móvil, 2 desde `sm`, 3 desde `lg`).
- Cuando se pagine, deberán mostrarse 12 por página (`FAVORITES_PAGE_SIZE`, constante configurable del frontend) con controles Anterior/Siguiente y "Página X de Y".
- Cuando se active "Eliminar" (botón con ícono de papelera y texto, con `aria-label="Eliminar <nombre> de favoritos"`), el favorito deberá quitarse de inmediato, con error en español si falla.
- Cuando no haya favoritos, deberá mantenerse el estado vacío con "Explorar catálogo" según 006/RF-8.
- Cuando un `productId` ya no exista en el catálogo, deberá ocultarse sin romper la grilla.

**RF-9 — Historial en carrusel con "cargar anteriores".**
Cuando el usuario vea su historial en `/perfil`, el sistema deberá mostrarlo como carrusel horizontal con fecha y carga progresiva. Modifica 006/RF-8 (supersede su paginación; `HISTORY_PAGE_SIZE` se reutiliza como tamaño de lote inicial y de cada carga).
Criterios de aceptación:
- Cuando haya historial, deberá mostrarse en un carrusel horizontal con desplazamiento por desbordamiento (sin paginación), con las visitas más recientes primero.
- Cuando se renderice cada tarjeta, deberá usar la mini-tarjeta de RF-8 sin botón "Eliminar" y mostrar la fecha de visualización en español (`Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })`).
- Cuando haya más visitas que las visibles, deberá existir un botón "Cargar anteriores" que agregue el siguiente lote de 10 manteniendo lo ya visible.
- Cuando ya no queden visitas por cargar, el botón "Cargar anteriores" no deberá mostrarse.
- Cuando el historial esté vacío, deberá mantenerse el estado vacío con "Explorar catálogo" según 006/RF-8.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final en español, incluidos "Nombre de usuario", "Nombre a mostrar", "Bienvenid@" si se usara, "Eliminar", "Cargar anteriores" y fechas (constitución §6). Identificadores en inglés.
- **RNF-2 Backend real y separación de capas.** `username` único con índice MongoDB y normalizado a minúsculas; `displayName` validado con Zod compartido; el frontend nunca toca la base de datos (constitución §5). Lógica en servicios backend y funciones puras frontend (§3).
- **RNF-3 Seguridad.** El `409` ante `username` duplicado revela existencia como ya lo hace el de correo (005/RF-1, aceptado); `username` editable solo en el perfil con `currentPassword`; hash y sesión sin cambios (005/RNF-3, 006/RNF-3).
- **RNF-4 Sistema de diseño "IDE institucional".** Tokens semánticos, tipografía (`font-mono` títulos/precios, `font-sans` texto), primitivas `Button`/`Input`/`Label`/`Card`/`Badge`, foco con `ring`; el contenedor de íconos sobre la imagen usa superficie semántica, nunca color literal.
- **RNF-5 Accesibilidad.** Hamburguesa con `aria-expanded`, cierre con `Escape` y retorno de foco; carrusel desplazable sin trampas de foco; `aria-pressed` en favoritos; errores en `role="alert"`; nada depende solo del color; contraste AA.
- **RNF-6 Responsividad.** Desde 360 px sin desplazamiento horizontal de página: burger bajo 640 px, grilla de favoritas 1→2→3 columnas, carrusel con desbordamiento interno.
- **RNF-7 Desempeño.** Sin dependencias nuevas: solo las ya sancionadas (005/RNF-6, 006/RNF-8). Animaciones 150 ms (RF-6) con movimiento reducido respetado.
- **RNF-8 Tests.** Lógica de negocio con tests (constitución §4): backend (registro con ambos campos, `409` de `username` sin distinguir caso, edición de `username` con `409` ante duplicado ajeno, contratos con ambos campos, adopción legacy); frontend (registro, botón `[DisplayName]`, burger, acciones de tarjeta incl. anónimo, mini-tarjetas con eliminar y paginación, carrusel con carga y fecha, sin "Volver"). `npm run check` de raíz verifica todo.

## Casos límite

- `username` con mayúsculas o espacios (`Pablo `): se normaliza a minúsculas; duplicado con distinto caso responde `409` (cubierto por RF-1).
- Dos registros concurrentes con el mismo `username`: el índice único evita el duplicado; el segundo responde `409` (cubierto por RF-1).
- Dos cambios concurrentes al mismo `username` libre: solo uno prospera; el otro responde `409` (cubierto por RF-1).
- `username` propio conservado en la edición: se acepta sin `409` (cubierto por RF-1).
- `displayName` repetido entre usuarios: ambos válidos, sin `409` (cubierto por RF-1).
- Documentos legacy sin `username`/`displayName`: adoptan `name` en ambos; duplicados previos de `name` impedirían crear el índice y deberán resolverse antes del despliegue (cubierto por RF-1).
- `displayName` vacío o de 81 caracteres: rechazado en frontend y backend (cubierto por RF-1).
- Menú burger abierto y cambio a ≥640 px: se muestra el nav completo sin duplicar accesos (cubierto por RF-5).
- Carrusel con una sola visita: sin "Cargar anteriores" y sin desbordamiento roto (cubierto por RF-9).
- "Cargar anteriores" con menos de 10 restantes: agrega lo que queda y el botón desaparece (cubierto por RF-9).
- Favorito o visita con `productId` inexistente: se oculta en ambas listas (cubierto por RF-8, RF-9).
- Táctil sin `hover`: los íconos de la tarjeta siguen visibles y operables (cubierto por RF-6).
- Sin "Volver": el logo y el atrás del navegador cubren el retorno; ninguna vista queda sin salida (cubierto por RF-4).

## Fuera de alcance

- Corrección del modo oscuro en botones de productos/catálogo (extra solicitado, diferido a una spec futura).
- Recuperación o liberación de `username` e inicio de sesión por `username` (el diseño único lo permite a futuro).
- Verificación de correo, roles, avatar, pedidos, pagos y despliegue.
- Sincronización entre pestañas y multi-dispositivo más allá de 006/RF-11–RF-13.

## Criterios de finalización

Esta tarea se considera terminada cuando:

1. El `User` persiste `username` (único, minúsculas, editable en el perfil) y `displayName`, los contratos públicos incluyen ambos y los legacy los adoptan (RF-1).
2. El registro pide ambos campos, valida en español y responde `409` ante duplicado de correo o `username` (RF-2).
3. El encabezado muestra `[DisplayName]` → `/perfil` con sesión (y `AuthBar` usa `displayName`); anónimo sin cambios (RF-3).
4. No existe "Volver" ni `showBackButton` en código ni tests; el logo sigue a `/` (RF-4).
5. Bajo 640 px hay hamburguesa con la navegación (logo y carrito siempre visibles), cierre con selección/`Escape` y retorno de foco; en 640 px o más todo visible sin hamburguesa (RF-5).
6. La tarjeta muestra íconos de carrito y favorito sobre la imagen con fondo distintivo, reacción a `hover`, estado relleno, redirect anónimo y sin navegación accidental (RF-6).
7. El detalle muestra "Agregar/Quitar de favoritos" con corazón alineado al carrito (RF-7).
8. Favoritos como mini-tarjetas en grilla paginada de 12 con "Eliminar" (ícono+texto), vacío y ocultamiento de inexistentes (RF-8).
9. Historial en carrusel con fecha en español y "Cargar anteriores" por lotes de 10 hasta agotar, con vacío preservado (RF-9).
10. Existen tests de backend y frontend según RNF-8.
11. La UI cumple diseño, accesibilidad y responsividad (RNF-4, RNF-5, RNF-6).
12. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Nueva spec **007** en vez de reabrir 006: la 006 queda congelada como línea base implementada; la 007 se redacta como delta con trazabilidad (`modifica 00N/RF-x`).
- [RESUELTO] `displayName`: **editable y no necesariamente único** (duplicados aceptados sin `409`); conserva mayúsculas y tildes; se captura en registro y perfil.
- [RESUELTO] Reglas de `username`: **único (insensible a caso, `409`) y editable solo en `/perfil`** (con `currentPassword`, como el resto de la edición); login sigue por correo pero la unicidad lo deja apto como identificador futuro; se almacena en minúsculas como el correo; `displayName` conserva formato.
- [RESUELTO] Burger: **navegación completa bajo `sm` salvo el carrito** (Catálogo, Favoritos, `[DisplayName]`/Perfil); logo TiendaDCC y carrito siempre visibles.
- [RESUELTO] Acceso de cuenta: **sin saludo ni botón "Perfil"**; el botón es el `[DisplayName]` (→ `/perfil`, nombre accesible "Mi perfil"); anónimo mantiene "Perfil" → `/iniciar-sesion`. `AuthBar` también muestra `displayName`.
- [RESUELTO] Mini-tarjetas de favoritas: **con botón "Eliminar" (papelera + texto)** en lugar del toggle de corazón; paginación de **12** (`FAVORITES_PAGE_SIZE`); grilla 1→2→3 columnas. El historial reutiliza la mini-tarjeta sin "Eliminar".
- [RESUELTO] Historial: **carrusel + "Cargar anteriores"** (reemplaza paginación de 006/RF-8); lote inicial y por carga de **10** (se reutiliza `HISTORY_PAGE_SIZE`); fecha con `Intl.DateTimeFormat('es-CL', …)` en español.
- [RESUELTO] Detalle: favorito con **texto + corazón alineado** al botón del carrito.
- [RESUELTO] `any` en `addFavoriteHandler`: **no existe** (verificado en `apps/backend/src`; solo `expect.any` en tests). Sin cambios.
- [RESUELTO] Modo oscuro en botones: **fuera de alcance**, diferido.
