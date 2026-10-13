# Spec 006 — Perfil de usuario

## Contexto y objetivo

La spec 005 dejó autenticación real: modelo `User` (`name`, `email` único en minúsculas, `passwordHash`) en MongoDB/Mongoose, endpoints `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` y `GET /api/auth/me` con sesión por cookie `httpOnly`, esquemas Zod compartidos en `utils/` y `AuthContext` con estado discriminado (`loading` | `anonymous` | `authenticated`). No existe vista de perfil, ni favoritos, ni historial de navegación. El carrito (004) vive solo en `localStorage` del navegador: es anónimo, no viaja con la cuenta y queda intacto al cerrar sesión (005, RF-5).

Esta spec define el **perfil del usuario autenticado** sobre esa base: consulta y edición de datos personales (nombre y correo, confirmando con la contraseña actual), estado de verificación de la cuenta (solo lectura en esta fase), favoritos persistidos e historial de navegación de productos persistido. Además, el carrito se sincroniza con la cuenta: se persiste en el documento del usuario, se fusiona con el carrito invitado al iniciar sesión (avisando en español) y se mantiene actualizado mientras hay sesión. Se exige ruta en español, formulario pre-rellenado, email con formato válido y feedback de éxito/fracaso; todo eso queda sancionado aquí como criterios verificables.

La implementación se divide en **3 partes**, con la validación mediante tests al final:

- **Parte 1 — Backend:** modelo extendido, `GET /api/users/me`, `PUT /api/users/me`, endpoints de favoritos e historial, y esquemas Zod compartidos (RF-1–RF-6).
- **Parte 2 — Frontend:** ruta `/perfil` protegida, `ProfilePage` en modo lectura y edición, secciones de favoritos e historial, registro de visitas desde el detalle y accesos de Favoritos/Perfil en el encabezado (RF-7–RF-10, RF-14).
- **Parte 3 — Sincronización con la cuenta:** carrito persistido en el `User`, fusión del carrito invitado al iniciar sesión con aviso, y persistencia continua mientras hay sesión (RF-11–RF-13). Los favoritos no requieren fusión: solo existen con cuenta (duda resuelta al final).
- **Validación final:** tests de backend y frontend más `npm run check` (RNF-9 y criterio de finalización).

Lo que **NO** incluye aún: recuperación de contraseña, cambio directo de contraseña (se gestionará mediante correo electrónico, pendiente), flujo de verificación de correo, roles, eliminación de cuenta, avatar, direcciones, pedidos, migración del catálogo a la API, ni despliegue.

## Usuarios

- **Usuario autenticado**: persona con sesión activa que consulta y edita sus datos, revisa sus favoritos e historial, y conserva su carrito en su cuenta entre dispositivos.
- **Visitante anónimo**: persona sin sesión cuyo carrito vive solo en su navegador; al acceder a `/perfil` o intentar guardar un favorito, es redirigida al inicio de sesión.
- **Desarrollador /s**: (implícito) quien implementa la funcionalidad; requiere criterios verificables, esquemas Zod compartidos, separación lógica/UI y tests.

## Historias de usuario

- Como usuario autenticado, quiero ver mi nombre, correo y estado de cuenta en `/perfil`, para saber qué datos tiene la tienda sobre mí.
- Como usuario autenticado, quiero editar mi nombre y correo confirmando con mi contraseña actual, para mantener mis datos al día de forma segura.
- Como usuario autenticado, quiero ver mis favoritos persistidos, para retomar productos que me interesaron.
- Como usuario autenticado, quiero ver mi historial de navegación de productos, para volver a lo que ya visité.
- Como usuario autenticado, quiero recibir confirmación o un error claro en español al guardar, para saber si el cambio se aplicó.
- Como visitante anónimo, quiero ser redirigido al inicio de sesión si accedo a `/perfil`, para entender que el perfil requiere cuenta.
- Como usuario autenticado, quiero que mi carrito se guarde en mi cuenta, para retomarlo aunque cambie de dispositivo o navegador.
- Como usuario que inicia sesión con un carrito invitado, quiero que se combine con el de mi cuenta sumando cantidades y que se me avise, para no perder ningún producto.
- Como visitante anónimo, quiero que al intentar guardar un favorito se me invite a iniciar sesión, para entender que los favoritos requieren cuenta.
- Como usuario autenticado, quiero accesos directos a Favoritos y a mi Perfil en el encabezado, para llegar a ellos en un clic desde cualquier vista.
- Como desarrollador, quiero esquemas Zod compartidos y una API validada con tests, para no duplicar reglas ni aceptar datos sin validar.

## Requisitos funcionales

### Parte 1 — Backend

**RF-1 — Modelo y persistencia del perfil.**
Cuando el backend gestione el perfil de un usuario, el sistema deberá persistirlo en MongoDB mediante el modelo `User` extendido.
Criterios de aceptación:
- Cuando se cree o migre un usuario, su documento deberá contener `favorites` (arreglo de identificadores de producto, vacío por defecto), `history` (arreglo de `{ productId, viewedAt }`, vacío por defecto) y `cart` (arreglo de `{ productId, quantity }`, vacío por defecto), además de `name`, `email` y `passwordHash` (005, RF-9).
- Cuando se consulte el perfil, el documento deberá exponer `emailVerified` (booleano, `false` por defecto, solo lectura en esta fase); cuando el usuario actualice su correo (RF-3), el valor de `emailVerified` no deberá modificarse.
- Cuando se serialice el perfil hacia el frontend, la respuesta no deberá incluir `passwordHash`, la contraseña actual ni campos internos de Mongoose (`__v`).
- Cuando se busque un usuario por correo, la comparación no deberá distinguir mayúsculas de minúsculas y el correo deberá almacenarse en minúsculas.

**RF-2 — Consulta del perfil (`GET /api/users/me`).**
Cuando un usuario autenticado consulte su perfil, el sistema deberá devolver sus datos públicos, favoritos, historial y carrito.
Criterios de aceptación:
- Cuando exista una cookie de sesión válida, deberá responder `200` con `id`, `name`, `email`, `emailVerified`, `favorites`, `history` (reciente primero) y `cart` (`{ productId, quantity }` por línea).
- Cuando no exista sesión o el JWT sea inválido, deberá responder `401` sin datos de usuario.
- Cuando la base de datos no esté disponible, deberá responder `503` con un mensaje genérico en español.
- Cuando se responda el perfil, la respuesta no deberá incluir `passwordHash` ni la contraseña.

**RF-3 — Actualización de datos (`PUT /api/users/me`).**
Cuando un usuario autenticado envíe nombre y correo con su contraseña actual, el sistema deberá actualizar sus datos si la contraseña es correcta.
Criterios de aceptación:
- Cuando el cuerpo sea válido y `currentPassword` coincida con el hash, deberá actualizar `name` y `email` (normalizado a minúsculas) y responder `200` con el perfil público.
- Cuando `currentPassword` falte o no coincida, deberá responder `401` con un mensaje en español y no deberá modificar ningún dato.
- Cuando los datos no cumplan el esquema Zod compartido (RF-6), deberá responder `400` con los errores por campo en español y no deberá modificar ningún dato.
- Cuando el nuevo correo ya pertenezca a otro usuario (sin distinguir mayúsculas), deberá responder `409` con un mensaje en español y no deberá modificar ningún dato.
- Cuando el cuerpo incluya campos no reconocidos (`favorites`, `history`, `cart`, `emailVerified`, `isAdmin`), deberá ignorarlos y no deberá asignarlos al usuario.
- Cuando no exista sesión, deberá responder `401` sin modificar ningún dato.

**RF-4 — Favoritos persistidos.**
Cuando un usuario autenticado gestione sus favoritos, el sistema deberá persistirlos en su documento y devolverlos actualizados.
Criterios de aceptación:
- Cuando reciba `POST /api/users/me/favorites` con un `productId` válido, deberá agregarlo si no existe y responder `200` con el arreglo actualizado.
- Cuando reciba `POST` con un `productId` ya guardado, deberá responder `200` con el mismo arreglo y no deberá duplicarlo.
- Cuando reciba `POST` con un `productId` inválido (vacío o no cadena), deberá responder `400` en español y no deberá modificar los favoritos.
- Cuando reciba `DELETE /api/users/me/favorites/:productId`, deberá eliminarlo si existe y responder `200` con el arreglo actualizado; cuando no exista, deberá responder `200` con el arreglo sin cambios (idempotente).
- Cuando no exista sesión, ambos endpoints deberán responder `401` sin modificar datos.

**RF-5 — Historial de navegación persistido.**
Cuando un usuario autenticado visite un producto, el sistema deberá registrar la visita en su historial con tope configurable y sin duplicados.
Criterios de aceptación:
- Cuando reciba `POST /api/users/me/history` con un `productId` válido, deberá moverlo al frente del historial (o agregarlo) con su `viewedAt` actualizado y responder `200` con el historial.
- Cuando el historial supere `MAX_PROD_HISTORY` entradas tras el registro, deberá conservar solo las `MAX_PROD_HISTORY` más recientes (`67`, constante compartida configurable en `utils/`).
- Cuando reciba `POST` con un `productId` inválido, deberá responder `400` en español y no deberá modificar el historial.
- Cuando no exista sesión, deberá responder `401` sin modificar datos.
- Cuando se consulte `GET /api/users/me` (RF-2), el historial deberá venir ordenado de más a menos reciente.

**RF-6 — Validación estricta con Zod compartido.**
Cuando el sistema valide el perfil, favoritos o historial, el sistema deberá usar esquemas Zod compartidos entre frontend y backend.
Criterios de aceptación:
- Cuando se validen los esquemas, estos deberán vivir en `utils/` e importarse desde frontend y backend mediante el workspace existente (005, RNF-5).
- Cuando se valide la actualización, el esquema deberá exigir `name` (1–80 caracteres tras `trim`), `email` (formato válido con `trim`) y `currentPassword` (mínimo 1 carácter); los mensajes deberán estar en español.
- Cuando se valide un favorito o una visita, el esquema deberá exigir `productId` como cadena no vacía tras `trim`.
- Cuando el backend reciba `PUT /api/users/me`, `POST` de favoritos, `POST` de historial o `PUT` del carrito (RF-11), deberá revalidar con el esquema compartido antes de tocar la base de datos.
- Cuando se validen el historial y el carrito, el esquema del historial deberá respetar `MAX_PROD_HISTORY` (`67`, entero positivo configurable en `utils/`) y el esquema de línea del carrito deberá exigir `productId` (cadena no vacía tras `trim`) y `quantity` (entero positivo); los mensajes deberán estar en español.
- Cuando el frontend valide el formulario de edición, deberá usar el mismo esquema y mostrar los mensajes en español sin enviar la petición si hay errores.

### Parte 2 — Frontend

**RF-7 — Ruta `/perfil` protegida.**
Cuando un usuario navegue a `/perfil`, el sistema deberá mostrarla solo a usuarios autenticados.
Criterios de aceptación:
- Cuando un usuario autenticado acceda a `/perfil`, deberá mostrarse `ProfilePage`.
- Cuando un visitante anónimo acceda a `/perfil`, deberá redirigirse a `/iniciar-sesion`.
- Cuando la sesión se esté restaurando, deberá mostrarse un estado neutro accesible y no deberá mostrarse el perfil ni la redirección antes de conocer el estado.
- Cuando la app se sirva con `HashRouter`, la URL visible deberá ser `#/perfil` y abrir/cerrar modos no deberá crear rutas adicionales.

**RF-8 — Modo lectura del perfil.**
Cuando un usuario autenticado vea su perfil, el sistema deberá mostrar sus datos, estado, favoritos e historial con un acceso a la edición.
Criterios de aceptación:
- Cuando el perfil cargue con éxito, deberán mostrarse el `name`, el `email` y el estado de la cuenta ("Cuenta verificada" o "Pendiente de verificación", nunca solo con color).
- Cuando el perfil cargue, deberá mostrarse un botón "Editar perfil" que active el modo edición (RF-9).
- Cuando los favoritos existan, deberán mostrarse resueltos contra el catálogo con enlace al detalle; cuando no haya favoritos, deberá mostrarse un mensaje en español con un botón "Explorar catálogo" que navegue a `#/catalogo`.
- Cuando el historial exista, deberá mostrarse resuelto contra el catálogo en orden reciente primero con enlace al detalle y con paginación de 10 elementos por página (`HISTORY_PAGE_SIZE`, constante configurable del frontend); cuando esté vacío, deberá mostrarse un mensaje en español con un botón "Explorar catálogo" que navegue a `#/catalogo`.
- Cuando el perfil cargue, deberá mostrarse un resumen "Mi carrito" con el número de productos y el total en pesos chilenos, con un control que abra el panel del carrito sin navegar.
- Cuando los datos estén cargando, deberá mostrarse un estado de carga accesible; cuando la carga falle, deberá mostrarse un error en español con una acción "Reintentar" que no pierda la sesión.
- Cuando un `productId` guardado ya no exista en el catálogo, deberá ocultarse sin romper la vista.

**RF-9 — Modo edición con confirmación por contraseña.**
Cuando el usuario edite su perfil, el sistema deberá pre-rellenar el formulario, exigir su contraseña actual y dar feedback del resultado.
Criterios de aceptación:
- Cuando se active "Editar perfil", el formulario deberá comenzar con los valores actuales de `name` y `email`, y deberá incluir el campo "Contraseña actual".
- Cuando el usuario envíe datos inválidos, deberán mostrarse los mensajes del esquema compartido en español por campo y no deberá enviarse la petición.
- Cuando el envío esté en curso, el botón "Guardar cambios" deberá deshabilitarse y el formulario no deberá enviarse dos veces.
- Cuando el backend responda `200`, deberán mostrarse un mensaje de éxito en español, volver al modo lectura y reflejar los nuevos datos (incluido el `name` en los accesos de autenticación).
- Cuando el backend responda `400`, `401` o `409`, deberá mostrarse el mensaje correspondiente en español sin perder los datos ingresados.
- Cuando ocurra un error de validación o del servidor, el foco deberá moverse a la región de error o al primer campo con error.
- Cuando el usuario active "Cancelar", deberá volver al modo lectura sin enviar nada y sin conservar cambios.

**RF-10 — Integración de favoritos e historial en el frontend.**
Mientras el usuario navegue y marque productos, el sistema deberá mantener favoritos e historial sincronizados con su cuenta.
Criterios de aceptación:
- Cuando un usuario autenticado visualice un producto existente en `/producto/:id`, el frontend deberá registrar la visita con `POST /api/users/me/history` sin bloquear el render del detalle.
- Cuando un visitante anónimo visualice un producto, no deberá registrarse ninguna visita.
- Cuando el detalle muestre "Producto no encontrado", no deberá registrarse ninguna visita.
- Cuando un usuario autenticado active el control de favorito en el detalle o en su perfil, el cambio deberá persistirse con `POST`/`DELETE /api/users/me/favorites` y reflejarse de inmediato, con error en español si falla.
- Cuando un visitante anónimo active el control de favorito, deberá redirigirse a `/iniciar-sesion` sin modificar nada.
- Cuando cambie el perfil (RF-9) o los favoritos, el estado de sesión expuesto no deberá perder los datos ya cargados salvo recarga explícita.

**RF-14 — Accesos de perfil y favoritos en el encabezado.**
Cuando el usuario vea el encabezado en cualquier vista, el sistema deberá ofrecer accesos funcionales a Favoritos y Perfil en lugar del marcador "Próximamente".
Criterios de aceptación:
- Cuando un usuario autenticado active "Favoritos" (corazón), deberá navegar a `/perfil` mostrando la sección de favoritos (desplazamiento y foco en la sección).
- Cuando un visitante anónimo active "Favoritos", deberá redirigirse a `/iniciar-sesion` sin modificar nada.
- Cuando un usuario autenticado active "Perfil" (persona), deberá navegar a `/perfil`.
- Cuando un visitante anónimo active "Perfil", deberá redirigirse a `/iniciar-sesion` sin modificar nada.
- Cuando se muestren los accesos, deberán conservar el estilo del encabezado (fantasma, etiqueta visible desde `sm`, solo ícono en móvil) y no deberá quedar ningún marcador "Próximamente" para Favoritos o Perfil.
- Cuando navegue a la sección de favoritos, la URL visible deberá seguir siendo `#/perfil` (se usa el estado de navegación, compatible con `HashRouter`).

### Parte 3 — Sincronización con la cuenta

**RF-11 — Carrito persistido en la cuenta.**
Cuando un usuario autenticado gestione su carrito, el sistema deberá persistirlo en su documento y aceptar su reemplazo completo validado.
Criterios de aceptación:
- Cuando reciba `PUT /api/users/me/cart` con un arreglo válido de `{ productId, quantity }`, deberá reemplazar el carrito guardado y responder `200` con el carrito actualizado.
- Cuando reciba `PUT` con líneas inválidas (`productId` vacío o `quantity` no entera positiva), deberá responder `400` en español y no deberá modificar el carrito.
- Cuando reciba `PUT` con un arreglo vacío, deberá vaciar el carrito guardado y responder `200` con el arreglo vacío.
- Cuando no exista sesión, deberá responder `401` sin modificar datos.
- Cuando se consulte `GET /api/users/me` (RF-2), el carrito guardado deberá incluirse en la respuesta.

**RF-12 — Fusión del carrito invitado al iniciar sesión.**
Cuando un usuario pase de anónimo a autenticado (inicio de sesión o registro en la sesión actual), el sistema deberá fusionar una sola vez el carrito invitado con el de su cuenta sumando únicamente lo agregado como invitado (delta sobre la huella sincronizada) y avisar en español solo ante fusión real.
Criterios de aceptación:
- Cuando el usuario pase de anónimo a autenticado, el frontend deberá calcular el delta (cantidades locales menos la huella sincronizada de esa cuenta, con un mínimo de cero por producto) y fusionar cuenta más delta sumando cantidades por `productId`.
- Cuando fusione, deberá revalidar el resultado contra el catálogo: los `productId` inexistentes deberán descartarse y `name`, `price` e `image` deberán tomarse del catálogo manteniendo las cantidades fusionadas (004, RF-7).
- Cuando el delta y la cuenta sean no vacíos y el resultado difiera del carrito local, deberá persistir el resultado en la cuenta con `PUT /api/users/me/cart` y en `localStorage`, y deberá mostrar un aviso en español en una región con `role="status"` indicando que ambos carritos se combinaron sumando cantidades.
- Cuando el delta esté vacío (incluido el re-login con el carrito ya sincronizado), deberá adoptar el de la cuenta sin mostrar aviso y sin enviar ningún `PUT` con arreglo vacío.
- Cuando la cuenta no tenga carrito guardado y el delta sea no vacío, deberá subir el carrito local sin mostrar el aviso de fusión.
- Cuando restaure la sesión al cargar la aplicación (recarga con cookie válida, sin pasar por anónimo), no deberá fusionar: con el carrito local vacío deberá adoptar el de la cuenta sin `PUT` ni aviso; con el carrito local igual a la huella deberá mantenerlo sin `PUT` ni aviso; con cambios locales no sincronizados deberá subirlos en silencio sin aviso.
- Cuando el carrito local esté vacío al iniciar sesión, registrarse o restaurar la sesión, el frontend deberá adoptar el de la cuenta sin enviar ningún `PUT` con arreglo vacío: la adopción nunca deberá vaciar el carrito guardado. El `PUT` con arreglo vacío (RF-11) queda reservado a la acción explícita del usuario de vaciar el carrito o quitar su última línea.
- Cuando la fusión o subida falle por error de red, deberá conservar el carrito local, mostrar un error en español y reintentar en el próximo cambio del carrito.
- Cuando sincronice (fusión, subida, persistencia o adopción), deberá guardar la huella sincronizada de esa cuenta en `localStorage` (espacio de nombres por cuenta, que sobrevive al cierre de sesión); cuando la escritura falle, la huella no deberá actualizarse.
- Cuando la fusión falle por error de red, deberá conservar el carrito local, mostrar un error en español y reintentar en el próximo cambio del carrito.

**RF-13 — Persistencia continua y cierre de sesión.**
Mientras haya sesión activa, el sistema deberá mantener el carrito local y el de la cuenta sincronizados sin bloquear la interfaz.
Criterios de aceptación:
- Cuando el carrito cambie con sesión activa, el frontend deberá persistirlo en la cuenta con `PUT /api/users/me/cart` sin bloquear el render ni la interacción.
- Cuando la persistencia falle, deberá mostrarse un error no bloqueante en español, el carrito local deberá conservarse como autoridad y el próximo cambio deberá reintentar el envío.
- Cuando el usuario cierre sesión, el carrito local no deberá modificarse y el carrito de la cuenta no deberá alterarse (005, RF-5).
- Cuando un visitante anónimo modifique el carrito, los cambios deberán guardarse solo en `localStorage` sin llamadas de red (004, RF-7).

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final (etiquetas, botones, errores, estados vacíos, mensajes de éxito) en español (constitución §6). Identificadores, tipos y funciones en inglés.
- **RNF-2 Backend real y separación de capas.** La lectura/escritura del perfil pasa por la API y los modelos Mongoose; el frontend nunca accede a la base de datos (constitución §5). La lógica vive en servicios/controladores del backend y en hooks/funciones puras del frontend, separada de la presentación (constitución §3). En desarrollo se usa el proxy de Vite `/api` → backend para que la cookie siga siendo del mismo sitio (005).
- **RNF-3 Seguridad.** `currentPassword` se verifica con el hash y nunca se persiste, registra ni devuelve; el hash jamás se expone (RF-1–RF-3). Revalidación Zod en el servidor para toda entrada. Sin asignación masiva (RF-3).
- **RNF-4 Sistema de diseño "IDE institucional".** La UI respeta `specs/00-design-system/spec.md`: tokens semánticos, tipografía (`font-mono` en títulos/precios, `font-sans` en texto largo), primitivas `Button`/`Input`/`Label`/`Card`/`Badge`, foco visible con `ring`, errores ámbar con texto o ícono (nunca solo color). Sin colores literales ni componentes animados nuevos.
- **RNF-5 Accesibilidad.** Campos con `label` asociado, `aria-invalid` y `aria-describedby`; errores en región con `role="alert"`; foco gestionado (RF-7, RF-9); todo operable por teclado; contraste AA.
- **RNF-6 Responsividad.** La vista es usable sin desplazamiento horizontal desde 360 px hasta escritorio; favoritos e historial se adaptan (lista o grilla) sin recortar contenido.
- **RNF-7 Desempeño.** La restauración de sesión y la carga del perfil no bloquean el primer render del resto de la interfaz; el registro de visitas (RF-10), la fusión (RF-12) y la persistencia del carrito (RF-13) no retrasan el detalle ni la interacción; la navegación es inmediata.
- **RNF-8 Dependencias.** Sin dependencias nuevas: solo las ya sancionadas (005, RNF-6). Cualquier otra exige actualizar antes esta spec (constitución §1).
- **RNF-9 Tests y validación final.** Toda lógica de negocio tiene tests (constitución §4): en backend, `GET`/`PUT /api/users/me` (éxito, sin sesión, datos inválidos, contraseña incorrecta, correo duplicado, no exposición del hash), favoritos (agregar, duplicado idempotente, eliminar, idempotente inexistente), historial (registro, reorden sin duplicados, tope `MAX_PROD_HISTORY`) y carrito (reemplazo válido, cuerpo inválido, vaciado, sin sesión); en frontend, esquemas compartidos, `ProfilePage` (lectura, edición pre-rellenada, validación local, éxito, errores, ruta protegida, carga/error, paginación del historial, resumen del carrito), registro de visitas, control de favorito anónimo, y sincronización del carrito (fusión con suma y aviso, revalidación contra el catálogo, persistencia continua, error con reintento, cierre de sesión sin tocar el carrito). El `npm run check` de la raíz verifica tipos y tests de frontend y backend.

## Casos límite

- Correo con mayúsculas o espacios en la edición: se recorta y normaliza a minúsculas; un duplicado con distinto caso responde `409` (cubierto por RF-3).
- Dos actualizaciones concurrentes al mismo correo: el índice único evita el duplicado; la segunda responde `409`, no `500` (cubierto por RF-3, RF-1).
- Contraseña actual incorrecta: responde `401` en español sin modificar nada (cubierto por RF-3).
- Cuerpo con campos extra (`isAdmin`, `favorites`, `history`, `cart`, `emailVerified`): se ignoran (cubierto por RF-3).
- JSON malformado: responde `400` sin modificar datos (cubierto por RF-3).
- Cookie ausente o JWT inválido en cualquier endpoint de perfil o del carrito: `401` y, en `/perfil`, redirección a `/iniciar-sesion` (cubierto por RF-2–RF-5, RF-7, RF-11).
- MongoDB no disponible: `503`/error genérico en español; el frontend muestra error con "Reintentar" sin perder la sesión (cubierto por RF-2, RF-8).
- `productId` de favorito o historial que ya no existe en el catálogo: se oculta en el frontend sin romper la vista (cubierto por RF-8).
- Favorito duplicado o eliminado inexistente: idempotente, sin errores (cubierto por RF-4).
- Historial con más de `MAX_PROD_HISTORY` entradas: se conservan las 67 más recientes y el perfil las pagina de 10 en 10 (cubierto por RF-5, RF-8).
- Doble clic en "Guardar cambios": solo se procesa un envío (cubierto por RF-9).
- Recarga en `/perfil` con sesión válida: sigue autenticado y recarga sus datos (cubierto por RF-7, RF-8).
- Usuario autenticado que cambia su correo: `emailVerified` no cambia y la sesión continúa (cubierto por RF-1, RF-3).
- Visita a producto inexistente o como anónimo: no registra historial (cubierto por RF-10).
- Inicio de sesión con carrito local y de la cuenta no vacíos: se fusionan sumando cantidades y se muestra el aviso en español (cubierto por RF-12).
- Adopción con carrito local vacío: se adopta el de la cuenta sin ningún `PUT` vacío; el vaciado solo ocurre por acción explícita del usuario (cubierto por RF-11, RF-12).
- Catálogo cambiado antes de fusionar (precios nuevos o productos eliminados): se aplican los valores del catálogo y se descartan los inexistentes (cubierto por RF-12).
- Fallo de red al fusionar o persistir el carrito: se conserva el carrito local y se reintenta en el próximo cambio (cubierto por RF-12, RF-13).
- Cierre de sesión con carrito: ni el local ni el de la cuenta se modifican (cubierto por RF-13).
- Anónimo que intenta guardar un favorito: es redirigido a `/iniciar-sesion` sin cambios (cubierto por RF-10).
- Recarga con el carrito idéntico en local y cuenta: no suma, no avisa y no escribe (cubierto por RF-12).
- Re-login con el carrito ya sincronizado: el delta está vacío y se adopta sin duplicar (cubierto por RF-12).
- Invitado que agrega productos tras cerrar sesión y vuelve a entrar: solo el delta se suma a la cuenta (cubierto por RF-12).
- Navegador compartido por dos cuentas: las huellas viven separadas por cuenta y no se mezclan (cubierto por RF-12).

## Fuera de alcance

- Cambio directo de contraseña en el perfil: se gestionará mediante verificación por correo electrónico (pendiente de una spec futura); el campo de contraseña en 006 solo confirma la edición.
- Verificación activa del correo (envío de enlaces o códigos) y recuperación/restablecimiento de contraseña.
- Roles, permisos, panel de administración y eliminación de cuenta.
- Avatar, direcciones, teléfono u otros datos del perfil.
- Pedidos, facturas e historial de compras (el historial de 006 es solo de navegación).
- Sincronización del carrito entre pestañas abiertas (004 sigue sin exigirla); la sincronización del carrito con la cuenta es RF-11–RF-13.
- Migración del catálogo (`products.json`) a la API; los `productId` de favoritos e historial son opacos para el backend.
- Límite de intentos, bloqueo de cuenta, CAPTCHA y CSRF explícito (la sesión se apoya en `SameSite=Lax` según 005).
- Despliegue, HTTPS real y endurecimiento de producción.

## Criterios de finalización

Esta tarea se considera terminada cuando:

1. El modelo `User` persiste `favorites`, `history`, `cart` y `emailVerified` (solo lectura) sin exponer el hash (RF-1).
2. `GET /api/users/me` devuelve el perfil con favoritos, historial y carrito, o `401`/`503` según corresponda (RF-2).
3. `PUT /api/users/me` actualiza nombre y correo solo con la contraseña actual correcta, valida con Zod y responde `400`/`401`/`409` sin efectos parciales (RF-3, RF-6).
4. Los favoritos se agregan y eliminan de forma idempotente y viajan en el perfil (RF-4).
5. El historial registra visitas sin duplicados, reciente primero, con tope `MAX_PROD_HISTORY` (67) y paginación de 10 por página en el perfil (RF-5, RF-6, RF-8).
6. La ruta `/perfil` es solo para autenticados, con estado neutro durante la restauración y redirección a `/iniciar-sesion` para anónimos (RF-7).
7. El modo lectura muestra datos, estado de cuenta, favoritos, historial paginado y resumen "Mi carrito" con estados de carga, error con "Reintentar" y vacíos en español (RF-8).
8. El modo edición parte de los valores actuales, exige contraseña actual, valida en español, evita doble envío, gestiona el foco y refleja el éxito en la vista y en la sesión (RF-9).
9. Las visitas se registran desde el detalle solo para autenticados con producto existente, los favoritos se sincronizan con feedback en español y el anónimo que intenta guardar un favorito es redirigido a `/iniciar-sesion` (RF-10).
10. El carrito se persiste en la cuenta con `PUT /api/users/me/cart` validado y viaja en el perfil (RF-11, RF-2).
11. Al pasar de anónimo a autenticado, el carrito invitado se fusiona con el de la cuenta sumando solo el delta sobre la huella (con aviso en español ante fusión real); al restaurar la sesión nunca se fusiona y la adopción no escribe; la huella por cuenta sobrevive al cierre de sesión (RF-12).
12. Con sesión activa cada cambio del carrito se persiste sin bloquear, con error no bloqueante y reintento; al cerrar sesión ningún carrito se altera y el anónimo solo usa `localStorage` (RF-13).
13. Existen tests de backend y frontend según RNF-9 y el `npm run check` de la raíz verifica frontend y backend.
14. La UI cumple el sistema de diseño "IDE institucional", accesibilidad y responsividad exigidas (RNF-4, RNF-5, RNF-6), y el encabezado ofrece Favoritos (a la sección en `/perfil`) y Perfil funcionales sin marcadores "Próximamente" (RF-14).
15. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Orden de implementación: **backend primero** (Parte 1: API y esquemas) y después frontend (Parte 2: `/perfil` contra la API real); sin mock intermedio. La validación con tests cierra el trabajo.
- [RESUELTO] Favoritos e historial con **persistencia completa** en el `User` (`favorites: string[]`, `history: { productId, viewedAt }[]` con tope `MAX_PROD_HISTORY` = 67, `cart: { productId, quantity }[]`); el backend trata los `productId` como opacos y el frontend los resuelve contra el catálogo estático.
- [RESUELTO] Edición: **nombre y correo editables exigiendo la contraseña actual** (`currentPassword`) en cada `PUT`; el email se normaliza a minúsculas y `emailVerified` no cambia en esta fase.
- [RESUELTO] Cambio de contraseña: **fuera de alcance en 006**; se gestionará mediante verificación por correo electrónico en una spec futura. La contraseña en esta spec solo confirma la edición.
- [RESUELTO] Ruta: **`/perfil`** (visible como `#/perfil` con `HashRouter`), coherente con `/registro`, `/iniciar-sesion` y `/catalogo`; se descarta `/profile` del borrador.
- [RESUELTO] Convivencia con 005: `GET /api/auth/me` sigue siendo el endpoint de sesión; `GET/PUT /api/users/me` es el recurso de perfil extendido (con favoritos, historial y carrito) según el borrador.
- [RESUELTO] Estado de cuenta: `emailVerified` booleano de solo lectura (`false` por defecto); se muestra como "Cuenta verificada" / "Pendiente de verificación" sin flujo de verificación en esta fase.
- [RESUELTO] Registro del historial: el frontend lo registra con `POST /api/users/me/history` al ver un producto existente estando autenticado, sin bloquear el detalle.
- [RESUELTO] Sincronización con la cuenta como **Parte 3** (RF-11–RF-13): el carrito se persiste en el `User`, se fusiona al iniciar sesión o registrarse **sumando cantidades** con aviso en español en una región con `role="status"`, y se mantiene sincronizado mientras hay sesión; al cerrar sesión ningún carrito se altera y el anónimo solo usa `localStorage`.
- [RESUELTO] Favoritos sin fusión: solo existen con cuenta y el anónimo que intenta guardar uno es redirigido a `/iniciar-sesion`; la "sincronización" de favoritos es su persistencia por cuenta (RF-4, RF-10).
- [RESUELTO] Historial con tope **`MAX_PROD_HISTORY` = 67** (constante configurable compartida en `utils/`) y **paginación de 10 por página** (`HISTORY_PAGE_SIZE`, constante configurable del frontend) en la sección del perfil.
- [RESUELTO] Lectura del carrito incluida en `GET /api/users/me`; escritura con `PUT /api/users/me/cart` de reemplazo completo validado; el `PUT /api/users/me` ignora `cart` (además de `favorites` e `history`).
- [RESUELTO] Fusión por **delta sobre huella sincronizada**: la suma ciega local+cuenta duplicaba en cada recarga y re-login; ahora solo se fusiona en la transición anónimo→autenticado sumando lo agregado como invitado, la restauración de sesión nunca fusiona, y la huella (`cart-synced:<userId>` en `localStorage`) sobrevive al logout.
- [RESUELTO] Accesos del encabezado: **Favoritos** (corazón → sección de favoritos en `/perfil` con desplazamiento y foco; anónimo → `/iniciar-sesion`) y **Perfil** (persona → `/perfil`; anónimo → `/iniciar-sesion`); se eliminan los marcadores "Próximamente" de ambos. La sección se pasa por estado de navegación para no romper `HashRouter`.
