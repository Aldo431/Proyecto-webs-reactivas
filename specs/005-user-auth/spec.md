# Spec 005 — Autenticación de usuarios

## Contexto y objetivo
Hoy la tienda es **solo frontend**: las specs 001–004 y `specs/home` dejaron inicio, catálogo, detalle, carrito y registro/login como páginas de formulario que **no hacen nada**. En `apps/frontend/client/src/pages/RegisterPage.tsx` y `LoginPage.tsx` el `onSubmit` solo ejecuta `event.preventDefault()` (001, RF-4/RF-5), `TextField.tsx` no es controlado, y `AuthBar.tsx` muestra siempre "Registrarse ahora" e "Iniciar sesión". El único backend existente es un "Hello World!" en `apps/backend/src/index.ts` (Express), sin modelos, sin base de datos y sin tests.

Esta spec convierte esos formularios en un **flujo de autenticación real**: registro, inicio de sesión, usuario actual y cierre de sesión, con **Express + MongoDB/Mongoose** en el backend, contraseñas con hash, sesión por cookie `httpOnly`, y validación estricta con **Zod** compartido entre frontend y backend. Habilita, además, el desbloqueo de `utils/` para los esquemas compartidos (pendiente registrado en `specs/home` y `specs/00-design-system`), y sujeta la UI de los formularios a la **fase 4** del sistema de diseño ("IDE institucional", `specs/00-design-system`).

Lo que **NO** incluye aún: recuperación o verificación de contraseña, inicio de sesión social, roles/permisos, perfil editable, sincronización del carrito (004) con la cuenta, migración del catálogo a la API, ni despliegue/HTTPS real.

## Usuarios
- **Visitante**: persona sin sesión que puede registrarse o iniciar sesión con correo y contraseña.
- **Usuario autenticado**: persona con sesión activa que ve su identidad y puede cerrar sesión.
- **Desarrollador /s**: (implícito) quien implementa el flujo; requiere criterios verificables, esquemas Zod compartidos, separación lógica/UI y tests.

## Historias de usuario
- Como visitante, quiero registrarme con mi nombre, correo y contraseña, para tener una cuenta en la tienda.
- Como visitante, quiero iniciar sesión con mi correo y contraseña, para volver a mi cuenta.
- Como visitante, quiero que mis datos se validen y me expliquen en español qué corregir, para no enviar información incorrecta.
- Como usuario autenticado, quiero que mi sesión se conserve al recargar, para no volver a iniciar sesión.
- Como usuario autenticado, quiero ver mi nombre y un botón "Cerrar sesión", para saber que estoy dentro y poder salir.
- Como usuario autenticado, quiero que mi contraseña esté protegida y nunca se muestre, para que mi cuenta sea segura.
- Como desarrollador, quiero esquemas Zod compartidos y una API validada, para no duplicar reglas ni aceptar datos sin validar.

## Requisitos funcionales

**RF-1 — Registro de usuario.**
Cuando un visitante envíe el formulario de registro con nombre, correo, contraseña y confirmación válidos, el sistema deberá crear la cuenta, iniciar su sesión y responder con los datos públicos del usuario.
Criterios de aceptación:
- Cuando el usuario envíe un formulario válido, el backend deberá crear el usuario y responder `201` con `id`, `name` y `email`, y `email` almacenado en minúsculas.
- Cuando el usuario envíe un formulario válido, el backend deberá almacenar la contraseña únicamente como hash (nunca en claro) y establecer la cookie de sesión (RF-4).
- Cuando el correo ya esté registrado, el backend deberá responder `409` con un mensaje en español y no deberá crear ni modificar ningún usuario.
- Cuando los datos no cumplan el esquema Zod compartido, el backend deberá responder `400` con los errores por campo en español y no deberá crear usuario.
- Cuando el registro tenga éxito, el frontend deberá reflejar la sesión (RF-6) y navegar al inicio (`/`).
- Cuando el backend responda con un usuario, la respuesta no deberá incluir `passwordHash` ni la contraseña.

**RF-2 — Inicio de sesión.**
Cuando un visitante envíe correo y contraseña válidos, el sistema deberá autenticarlo y establecer una sesión.
Criterios de aceptación:
- Cuando las credenciales sean válidas, el backend deberá responder `200` con los datos públicos del usuario y establecer la cookie de sesión (RF-4).
- Cuando el correo no exista o la contraseña no coincida, el backend deberá responder `401` con un mensaje genérico en español ("Correo o contraseña incorrectos."), sin revelar cuál dato falló.
- Cuando el usuario tenga una sesión activa e inicie sesión de nuevo, el backend deberá aceptar las credenciales válidas y renovar la cookie.
- Cuando el inicio de sesión tenga éxito, el frontend deberá reflejar la sesión (RF-6) y navegar al inicio (`/`).
- Cuando el usuario no exista, la contraseña enviada no deberá compararse contra un hash inexistente de forma que distorsione el tiempo de respuesta de forma notoria.
- Cuando se autentique, la contraseña no deberá registrarse en logs ni devolverse en la respuesta.

**RF-3 — Validación estricta con Zod compartido.**
El sistema deberá validar el registro y el inicio de sesión con esquemas Zod compartidos entre frontend y backend.
Criterios de aceptación:
- Cuando el frontend valide el formulario, deberá usar el esquema compartido y mostrar los mensajes en español sin enviar la petición si hay errores.
- Cuando el backend reciba una petición de registro o de inicio de sesión, deberá revalidar con el mismo esquema antes de consultar la base de datos.
- Cuando se valide un correo, el esquema deberá exigir formato de correo válido y recortar espacios (`trim`) antes de comparar.
- Cuando se valide una contraseña, el esquema deberá exigir entre 8 y 100 caracteres.
- Cuando se valide un nombre (solo registro), el esquema deberá exigir entre 1 y 80 caracteres tras recortar espacios.
- Cuando se valide el registro, la confirmación deberá coincidir con la contraseña; si no coincide, el frontend deberá mostrarlo en español y no enviar la petición (el backend no recibe el campo de confirmación).
- Cuando el cuerpo incluya campos no reconocidos, el backend deberá ignorarlos y no deberá asignarlos al usuario (sin _mass assignment_).

**RF-4 — Sesión por cookie `httpOnly` y restauración.**
El sistema deberá mantener la sesión entre recargas mediante una cookie de sesión no accesible por JavaScript y restaurarla al iniciar.
Criterios de aceptación:
- Cuando el backend establezca sesión, deberá emitir un JWT firmado con el secreto de entorno (RF-11) y enviarlo en una cookie `httpOnly`, `SameSite=Lax` y `Path=/`; en producción deberá llevar además `Secure`.
- Cuando el frontend consuma la API, deberá hacerlo con credenciales incluidas (`credentials: "include"`) para enviar y recibir la cookie.
- Cuando la aplicación cargue, el frontend deberá consultar `GET /api/auth/me` (RF-10) y exponer el usuario si la sesión es válida; si no, deberá quedar anónimo.
- Cuando la cookie falte, esté vencida o el JWT sea inválido, el backend deberá responder `401` y el frontend deberá quedar anónimo sin errores visibles.
- Cuando el usuario recargue cualquier vista estando autenticado, deberá seguir autenticado.
- Cuando la restauración de la sesión esté en curso, la interfaz no deberá bloquearse ni mostrar el estado autenticado antes de conocer la respuesta.

**RF-5 — Cierre de sesión.**
Cuando el usuario autenticado active "Cerrar sesión", el sistema deberá terminar la sesión.
Criterios de aceptación:
- Cuando el usuario active "Cerrar sesión", el frontend deberá llamar a `POST /api/auth/logout`, el backend deberá borrar la cookie y el frontend deberá quedar anónimo.
- Cuando el cierre de sesión se complete, el usuario deberá ser redirigido al inicio (`/`).
- Cuando el backend reciba un cierre de sesión sin sesión activa, deberá responder igualmente `204` (idempotente).
- Cuando se cierre la sesión, el carrito guardado en `localStorage` (004) no deberá modificarse.

**RF-6 — Accesos de autenticación que reflejan la sesión.**
Mientras el estado de sesión sea conocido, el sistema deberá mostrar los accesos de registro/inicio para visitantes y la identidad con "Cerrar sesión" para usuarios autenticados.
Criterios de aceptación:
- Cuando no haya sesión, los accesos de autenticación (p. ej. `AuthBar.tsx`) deberán mostrar "Registrarse ahora" (→ `/registro`) e "Iniciar sesión" (→ `/iniciar-sesion`).
- Cuando haya sesión, deberán mostrar el `name` del usuario y un control "Cerrar sesión", y no deberán mostrar "Registrarse ahora" ni "Iniciar sesión".
- Cuando la sesión se esté restaurando, los accesos deberán mostrar un estado neutro accesible y no deberán mostrar "Registrarse ahora"/"Iniciar sesión" antes de conocer el estado.
- Cuando el usuario cierre sesión desde los accesos, deberá aplicarse RF-5.

**RF-7 — Formularios funcionales con errores en español.**
Mientras el usuario complete los formularios de registro o de inicio de sesión, el sistema deberá mostrar validación local y errores del servidor en español.
Criterios de aceptación:
- Cuando el usuario envíe un formulario con campos inválidos, deberá mostrarse por campo el mensaje del esquema compartido en español y no deberá enviarse la petición.
- Cuando el envío esté en curso, el botón de envío deberá deshabilitarse y el formulario no deberá enviarse dos veces.
- Cuando el backend responda `400`, `401` o `409`, el frontend deberá mostrar el mensaje correspondiente (por campo o general) en español sin perder los datos ingresados.
- Cuando ocurra un error de validación o del servidor, el foco deberá moverse a la región de error o al primer campo con error.
- Cuando el usuario corrija un campo con error y reenvíe, el error de ese campo deberá limpiarse.

**RF-8 — Redirección de las rutas de autenticación.**
Cuando un usuario autenticado acceda a `/registro` o `/iniciar-sesion`, el sistema deberá redirigirlo al inicio; estas rutas son solo para visitantes anónimos.
Criterios de aceptación:
- Cuando un usuario autenticado acceda a `/registro` o `/iniciar-sesion`, deberá redirigirse a `/`.
- Cuando un usuario anónimo acceda a `/registro` o `/iniciar-sesion`, deberá mostrarse el formulario correspondiente.
- Cuando el usuario se autentique desde cualquiera de esos formularios, deberá salir de esa ruta hacia `/`.

**RF-9 — Modelo y persistencia de usuario.**
El sistema deberá persistir los usuarios en MongoDB mediante un modelo Mongoose.
Criterios de aceptación:
- Cuando se cree un usuario, su documento deberá contener `name`, `email` (único, en minúsculas) y `passwordHash`, además de las marcas de tiempo.
- Cuando se intente insertar un correo ya existente, el índice único deberá impedir el duplicado y la API deberá responder `409`.
- Cuando se busque un usuario para autenticar, la comparación de correo no deberá distinguir mayúsculas de minúsculas.
- Cuando se serialice un usuario hacia el frontend, el documento no deberá exponer `passwordHash` ni campos internos de Mongoose (`__v`).

**RF-10 — Endpoint de usuario actual.**
El sistema deberá exponer `GET /api/auth/me`, que devuelve el usuario de la sesión o `401`.
Criterios de aceptación:
- Cuando exista una cookie de sesión válida, deberá responder `200` con `id`, `name` y `email`.
- Cuando no exista sesión o el JWT sea inválido, deberá responder `401` sin datos de usuario.
- Cuando la base de datos no esté disponible al resolver el usuario, deberá responder `503` con un mensaje genérico en español.

**RF-11 — Variables de entorno validadas con Zod.**
El sistema deberá validar al iniciar sus variables de entorno con Zod y abortar con un mensaje claro si faltan o son inválidas.
Criterios de aceptación:
- Cuando el backend arranque sin `MONGODB_URI` o sin `JWT_SECRET` válidos, deberá abortar con un mensaje en español que indique la variable faltante y no deberá escuchar peticiones.
- Cuando el frontend arranque, deberá validar con Zod la URL base de la API (p. ej. `VITE_API_URL`); si falta o es inválida, deberá fallar con un mensaje claro.
- Cuando las variables sean válidas, el backend y el frontend deberán iniciar normalmente.

**RF-12 — Actualización de los formularios existentes.**
El sistema deberá convertir `RegisterPage.tsx` y `LoginPage.tsx` en formularios funcionales, extendiendo `TextField.tsx` para soportar datos controlados y errores accesibles.
Criterios de aceptación:
- Cuando `TextField` se use con valor controlado, deberá exponer `value`, `onChange`, `error` y `name`, y asociar el mensaje de error al campo.
- Cuando un campo tenga error, su `<input>` deberá exponer `aria-invalid="true"` y `aria-describedby` apuntando al mensaje, y el mensaje deberá estar en español.
- Cuando el formulario de registro se muestre, deberá conservar los campos "Nombre", "Correo electrónico", "Contraseña" y "Confirmar contraseña" (001, RF-4), ahora funcionales.
- Cuando el formulario de inicio de sesión se muestre, deberá conservar los campos "Correo electrónico" y "Contraseña" (001, RF-5), ahora funcionales.
- Cuando el usuario envíe cualquiera de los formularios, ya no deberá limitarse a `preventDefault()` sino ejecutar el flujo real (RF-1/RF-2).

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final (mensajes de validación, errores de red, botones) en español (constitución §6). Identificadores, tipos y funciones en inglés.
- **RNF-2 Backend real y separación de capas.** La autenticación persiste en MongoDB/Mongoose mediante Express. El frontend nunca accede a la base de datos: toda lectura/escritura pasa por la API (constitución §5). En desarrollo, el frontend consume la API mediante el proxy de Vite `/api` → backend, de forma que la cookie de sesión sea del mismo sitio. La lógica de autenticación vive en funciones/servicios del backend y en hooks/funciones puras del frontend, separada de la presentación (constitución §3).
- **RNF-3 Seguridad.** Contraseñas con hash y salt (`bcryptjs` o `bcrypt`, costo 10–12). El hash, la contraseña y el secreto JWT nunca se exponen, registran ni devuelven. Errores de login genéricos (RF-2). Cookie `httpOnly`, `SameSite=Lax`, `Path=/` y `Secure` en producción (RF-4). JWT firmado con `JWT_SECRET` de entorno. Revalidación Zod en el servidor para toda entrada (constitución §6, AGENTS.md).
- **RNF-4 Accesibilidad.** Campos con `label` asociado, `aria-invalid` y `aria-describedby`; errores en una región con `role="alert"`; foco visible con el token `ring`; todo operable por teclado; ningún estado depende solo del color (ícono o texto acompaña); contraste AA (DS, RNF-4).
- **RNF-5 Validación Zod compartida.** Los esquemas de registro y login viven en `utils/` y se importan desde frontend y backend mediante un **workspace npm**, para no duplicar reglas ni aceptar datos sin validar (AGENTS.md; constitución §6).
- **RNF-6 Dependencias sancionadas.** Esta spec autoriza como excepción a la constitución §1: en backend, `mongoose`, `bcryptjs` (o `bcrypt`), `jsonwebtoken` y `cookie-parser`; como desarrollo de backend, `vitest`, `supertest`, `mongodb-memory-server` y los `@types` correspondientes. No se agregan otras dependencias sin actualizar antes esta spec.
- **RNF-7 Responsividad.** Los formularios de registro e inicio de sesión deben ser usables y sin desplazamiento horizontal desde 360 px de ancho hasta escritorio (DS, RNF-3).
- **RNF-8 Desempeño.** La restauración de sesión no debe bloquear el primer render del resto de la interfaz; la navegación entre vistas es inmediata (DS, RNF-5).
- **RNF-9 Sistema de diseño "IDE institucional".** La UI de los formularios respeta `specs/00-design-system/spec.md` (fase 4): tokens semánticos, tipografía, `Button`, foco con `ring`, mensajes en español y movimiento reducido. No se usan colores literales ni paletas por defecto.
- **RNF-10 Tests.** Deben tener tests (constitución §4): en backend, registro (éxito, correo duplicado, datos inválidos), login (éxito, credenciales inválidas), `me` (con y sin cookie), no exposición de `passwordHash` y validación de esquemas; en frontend, los esquemas Zod compartidos, el contexto/hook de sesión y los formularios (validación local, envío, errores y redirección). El `npm run check` de la raíz debe ejecutar la verificación de tipos y los tests de **frontend y backend**.
- **RNF-11 Estado de sesión tipado.** El estado de autenticación del frontend debe exponerse como estado discriminado (`loading` | `anonymous` | `authenticated`) mediante un hook o contexto, sin que los componentes conozcan los detalles de la API.

## Casos límite
- Correo con mayúsculas o espacios (`Foo@Bar.com `): se recorta y normaliza a minúsculas; un duplicado con distinto caso se detecta (RF-3, RF-9).
- Dos registros concurrentes con el mismo correo: el índice único evita el duplicado; el segundo responde `409`, no `500` (RF-9).
- Confirmación de contraseña distinta de la contraseña: se bloquea en el frontend con mensaje en español; el backend no recibe ese campo (RF-3).
- Contraseña de 8 caracteres (mínimo) y de 100 (máximo): aceptadas; 7 o 101: rechazadas por el esquema (RF-3).
- Nombre vacío o solo espacios: rechazado tras `trim` (RF-3).
- Cuerpo con campos extra (`isAdmin: true`): se ignoran; no se asignan al usuario (RF-3).
- JSON malformado o `Content-Type` incorrecto: el backend responde `400` sin crear ni autenticar usuario (RF-1, RF-2).
- Cookie ausente, vencida o con JWT inválido: `me` responde `401` y el frontend queda anónimo sin errores visibles (RF-4, RF-10).
- Login inexistente: respuesta genérica `401`, sin distinguir correo de contraseña (RF-2).
- MongoDB no disponible durante registro/login/`me`: respuesta `503`/error genérico en español, sin filtrar detalles internos; el frontend muestra un error y no pierde los datos ingresados (RF-7, RF-10).
- Doble clic en "Registrarse"/"Iniciar sesión": el botón se deshabilita y solo se procesa un envío (RF-7).
- Recarga durante la restauración de sesión: no hay parpadeo del estado autenticado ni errores; la interfaz se actualiza al resolver (RF-4, RF-6).
- Usuario autenticado en `/registro` o `/iniciar-sesion`: es redirigido a `/` (RF-8).
- Cierre de sesión sin sesión activa: responde `204` (idempotente) (RF-5).
- Cierre de sesión con el carrito (004) con ítems: el carrito en `localStorage` no se altera (RF-5).
- Recarga de la aplicación tras iniciar sesión: el usuario sigue autenticado (RF-4).
- Backend sin `MONGODB_URI` o `JWT_SECRET`: el proceso aborta con mensaje claro y no queda escuchando (RF-11).

## Fuera de alcance
- Recuperación/restablecimiento de contraseña y verificación por correo.
- Inicio de sesión social (Google, GitHub, U. de Chile), SSO y autenticación de dos factores.
- Roles, permisos, panel de administración, edición de perfil y eliminación de cuenta.
- Remitir correos, plantillas de correo y servicios externos.
- Límite de intentos, bloqueo de cuenta, CAPTCHA y tokens CSRF explícitos (la protección se apoya en `SameSite=Lax`).
- Rotación/revocación de tokens y refresh tokens; "recordarme" y sesiones multi-dispositivo.
- Sincronización del carrito (004), favoritos o pedidos con la cuenta del usuario.
- Migrar el catálogo/productos (`products.json`) a la API; esta spec solo mueve a backend la autenticación.
- Despliegue, HTTPS real y endurecimiento de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. El registro crea usuarios en MongoDB con `passwordHash`, valida con Zod, responde `201` sin exponer el hash y responde `409` ante correo duplicado (RF-1, RF-3, RF-9).
2. El inicio de sesión valida credenciales, responde `200` con los datos públicos y `401` genérico ante fallo, y establece la cookie de sesión (RF-2, RF-4).
3. La sesión viaja en cookie `httpOnly` `SameSite=Lax` (y `Secure` en producción) y se restaura con `GET /api/auth/me`, quedando anónimo ante cookie ausente o inválida (RF-4, RF-10).
4. El cierre de sesión borra la cookie, es idempotente (`204`) y deja al usuario anónimo sin tocar el carrito (RF-5).
5. Los accesos de autenticación muestran registro/inicio para visitantes y nombre + "Cerrar sesión" para usuarios autenticados, con estado neutro durante la restauración (RF-6).
6. Los formularios de registro e inicio de sesión son funcionales, controlados y accesibles, muestran validación local y errores del servidor en español y no permiten doble envío (RF-7, RF-12).
7. Un usuario autenticado que accede a `/registro` o `/iniciar-sesion` es redirigido a `/` (RF-8).
8. El backend valida `MONGODB_URI` y `JWT_SECRET` (y el frontend su URL de API) con Zod al iniciar y aborta con mensaje claro si faltan (RF-11).
9. Los esquemas de registro y login viven en `utils/` y se importan desde frontend y backend (RNF-5).
10. Existen tests de backend (registro, login, `me`, duplicados, esquemas, no exposición del hash) y de frontend (esquemas, contexto de sesión y formularios), y el `npm run check` de la raíz verifica frontend y backend (RNF-10).
11. La UI de los formularios cumple el sistema de diseño "IDE institucional" y la accesibilidad exigida (RNF-4, RNF-7, RNF-9).
12. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Framework del backend: **Express**. Se ratifica por coherencia con `AGENTS.md`, `README.md` y el código existente (`apps/backend/src/index.ts`). La discrepancia con la constitución §1 (que nombra Hono) queda como pendiente de corregir en la constitución; la spec 005 se redacta sobre Express.
- [RESUELTO] Estrategia de sesión: JWT firmado con `JWT_SECRET`, transportado en cookie `httpOnly`, `SameSite=Lax`, `Path=/` (y `Secure` en producción), restaurado con `GET /api/auth/me`. No se guarda el token en `localStorage`.
- [RESUELTO] Hash de contraseña con `bcryptjs` (o `bcrypt`) y costo 10–12; nunca se devuelve ni registra el hash ni la contraseña.
- [RESUELTO] Mensajes de error de login genéricos ("Correo o contraseña incorrectos.") para no revelar la existencia del correo.
- [RESUELTO] Ubicación de los esquemas Zod compartidos: se configura un **workspace npm** en el `package.json` raíz para que `utils/` sea importable desde frontend y backend (desbloquea el pendiente de `specs/home`/`specs/00-design-system`). Los esquemas de registro y login viven en `utils/`; el detalle de la configuración se define en `plan.md`.
- [RESUELTO] Servicio de la API en desarrollo: **proxy de Vite `/api` → backend** (p. ej. `http://localhost:3001`), de modo que la cookie sea del mismo sitio y no dependa de CORS con credenciales. `VITE_API_URL` queda para otros entornos.
- [RESUELTO] El registro no recibe "confirmar contraseña" en el backend: la coincidencia se valida en el frontend con el esquema compartido.
- [RESUELTO] El carrito (004) no se sincroniza con la cuenta: es fuera de alcance en esta fase.
- [RESUELTO] Se actualizan `TextField.tsx`, `RegisterPage.tsx`, `LoginPage.tsx`, `AuthBar.tsx` y los tests afectados (`App.test.tsx`, `LoginPage.test.tsx`, `RegisterPage.test.tsx`) sin eliminar aserciones, salvo las que cambian explícitamente por esta spec.
