# Spec 010 — Recuperación de contraseña

## Contexto y objetivo

Las specs 005 (user-auth) y 007 (profile-polish) dejaron un sistema de identidad con registro, inicio de sesión, sesión persistente por cookie `httpOnly` y perfil de usuario. El modelo `User` en MongoDB almacena `passwordHash` (bcrypt), `email` único y validado, pero **no existe ningún mecanismo para recuperar la contraseña** si el usuario la olvida. El login view (`/iniciar-sesion`) no ofrece un enlace "¿Olvidaste tu contraseña?".

Esta spec agrega un **flujo completo de recuperación de contraseña** con envío real de correo electrónico vía SMTP (Nodemailer). El usuario solicita un restablecimiento desde `/recuperar-clave`, recibe un enlace con un token criptográficamente seguro válido por 15 minutos, y establece una nueva contraseña en `/resetear-clave/:token`. Se implementa limitación de tasa (rate limiting) para prevenir abusos: máximo 3 solicitudes por correo por hora.

Se redacta como **delta explícito** sobre 005 y 007: cada RF indica si es nuevo o qué RF previo modifica. Las specs previas quedan congeladas como línea base.

**Nuevas dependencias** (constitución §1): `nodemailer` y `@types/nodemailer` para el envío de correos, y `express-rate-limit` para la limitación de tasa. Se agregan variables de entorno SMTP en `apps/backend/.env`. En **modo desarrollo** (`NODE_ENV=development`), el envío de correo se bypassa: el token se imprime en consola y se devuelve en el body de la respuesta (campo `devToken`), de modo que los desarrolladores no necesitan credenciales SMTP reales para probar el flujo.

Lo que **NO** incluye: verificación de correo electrónico (el campo `emailVerified` existe pero no se usa en este flujo), autenticación de dos factores, cambio de contraseña desde el perfil con la contraseña actual conocida, bloqueo de cuentas tras intentos fallidos de login, ni prevención de reutilización de la contraseña anterior (el usuario puede volver a poner la misma si quiere).

## Usuarios

- **Usuario autenticado con sesión activa**: persona que olvidó su contraseña en otro dispositivo o navegador y necesita recuperarla sin cerrar la sesión actual (si la tiene).
- **Usuario que olvidó su contraseña**: persona que no puede iniciar sesión y necesita restablecerla desde cero.
- **Usuario anónimo**: persona que accede a `/iniciar-sesion`, ve el enlace "¿Olvidaste tu contraseña?" y lo usa.
- **Desarrollador /s**: (implícito) quien implementa la feature; requiere integración SMTP, tokens seguros, rate limiting, y tests de rutas y UI.

## Historias de usuario

- Como usuario que olvidó mi contraseña, quiero solicitar un restablecimiento por correo, para recuperar el acceso a mi cuenta.
- Como usuario, quiero recibir un enlace seguro en mi correo, para restablecer mi contraseña sin que nadie más pueda usarlo.
- Como usuario, quiero que el enlace expire después de un tiempo razonable, para que no quede válido indefinidamente.
- Como usuario, quiero ver un mensaje claro si el token es inválido o expiró, para saber qué hacer.
- Como usuario, quiero poder establecer una nueva contraseña segura, para proteger mi cuenta.
- Como usuario, quiero ver un enlace "¿Olvidaste tu contraseña?" en el login, para acceder fácilmente al flujo.
- Como desarrollador, quiero limitar cuántas solicitudes de restablecimiento se pueden hacer por correo, para prevenir abusos.
- Como desarrollador, quiero que el sistema no revele si un correo existe o no, para prevenir enumeración de cuentas.

## Requisitos funcionales

**RF-1 — Modelo `User` con campos de restablecimiento.**
El sistema deberá agregar campos al modelo `User` para almacenar el token de restablecimiento y su expiración. Nuevo; extiende 005 (modelo `User`).
Criterios de aceptación:
- Cuando se inspeccione `apps/backend/src/models/User.ts`, `UserFields` deberá incluir `resetToken: string | null` (índice único parcial cuando no sea `null`), `resetTokenExpiry: Date | null`, ambos opcionales y por defecto `null`.
- Cuando se cree un documento `User`, estos campos no deberán ser requeridos.
- Cuando se actualicen estos campos, deberán validarse con Zod (token no vacío, expiración válida).

**RF-2 — Configuración SMTP y variables de entorno.**
El sistema deberá configurar Nodemailer con variables de entorno y validarlo con Zod. Nuevo.
Criterios de aceptación:
- Cuando se inspeccione `apps/backend/src/config/env.ts`, `envSchema` deberá incluir `SMTP_HOST` (string requerido), `SMTP_PORT` (coerción a entero, requerido), `SMTP_USER` (string requerido), `SMTP_PASS` (string requerido), `SMTP_FROM` (string requerido, email válido), todos con mensajes en español.
- Cuando falte alguna variable, el proceso deberá abortar con un mensaje en español indicando cuál falta.
- Cuando se cree el transporter de Nodemailer (`apps/backend/src/services/emailService.ts`), deberá usar `smtpTransport` con las variables del entorno.
- Cuando se actualice `.env.example`, deberá incluir las nuevas variables con comentarios en español.

**RF-3 — Solicitud de restablecimiento `POST /api/auth/forgot-password`.**
El sistema deberá generar un token y enviarlo por correo al usuario. Nuevo.
Criterios de aceptación:
- Cuando se reciba `POST /api/auth/forgot-password` con `{ email }`, el sistema deberá buscar el usuario por email (case-insensitive).
- Cuando el usuario no exista, deberá responder `200` con `{ message: "Si el correo existe, recibirás un enlace para restablecer tu contraseña." }` (sin revelar si existe, para prevenir enumeración).
- Cuando el usuario exista, deberá generar un token criptográficamente seguro de 32 bytes en formato hex (64 caracteres), guardar `resetToken` y `resetTokenExpiry` (fecha actual + 15 minutos), y enviar un correo con el enlace `http://localhost:5173/resetear-clave/<token>` (o `CLIENT_ORIGIN/resetear-clave/<token>` en producción).
- Cuando el correo se envíe con éxito, deberá responder `200` con el mismo mensaje (sin revelar detalles).
- Cuando falle el envío del correo, deberá responder `500` con "No se pudo enviar el correo. Intenta más tarde." y no deberá guardar el token.
- Cuando el límite de tasa se exceda (más de 3 solicitudes por email en la última hora), deberá responder `429` con "Has excedido el límite de solicitudes. Intenta más tarde."

**RF-4 — Limitación de tasa por IP y por email.**
El sistema deberá limitar las solicitudes de restablecimiento para prevenir abusos. Nuevo.
Criterios de aceptación:
- Cuando se inspeccione `apps/backend/src/middleware/rateLimit.ts`, deberá existir un middleware `forgotPasswordRateLimit` que use `express-rate-limit` con almacenamiento en memoria (o Redis si se configura).
- Cuando se aplique a `POST /api/auth/forgot-password`, deberá limitar a 3 solicitudes por email por hora (ventana deslizante).
- Cuando se aplique por IP, deberá limitar a 5 solicitudes por IP por hora (para prevenir ataques distribuidos).
- Cuando se exceda el límite, el header `Retry-After` deberá indicar cuántos segundos esperar.

**RF-5 — Esquemas compartidos en `@tiendadcc/utils`.**
El sistema deberá definir los esquemas de validación en `utils/` y usarlos en frontend y backend. Nuevo; extiende 005 (esquemas de auth).
Criterios de aceptación:
- Cuando se inspeccione `utils/src/authSchemas.ts`, deberá exportar `forgotPasswordInputSchema` (email válido, trim, longitud 1–255), `resetPasswordInputSchema` (token no vacío, password con las mismas reglas que en registro: 8–100 caracteres, mensajes en español), y sus tipos inferidos.
- Cuando se valide un email inválido, deberá rechazarse con "Correo electrónico inválido."
- Cuando se valide una contraseña que no cumpla las reglas de registro, deberá rechazarse con los mismos mensajes (005/RF-x).
- Cuando el frontend necesite los tipos, deberá importarlos de `@tiendadcc/utils`.

**RF-6 — Validación de token `GET /api/auth/validate-reset-token/:token`.**
El sistema deberá validar si un token es válido y no ha expirado. Nuevo.
Criterios de aceptación:
- Cuando se reciba `GET /api/auth/validate-reset-token/:token`, el sistema deberá buscar un usuario con `resetToken = token` y `resetTokenExpiry > fecha actual`.
- Cuando el token sea válido, deberá responder `200` con `{ valid: true }`.
- Cuando el token no exista o haya expirado, deberá responder `200` con `{ valid: false }` (sin revelar por qué).
- Cuando el token sea inválido (formato incorrecto, no hex de 64 caracteres), deberá responder `200` con `{ valid: false }`.

**RF-7 — Restablecimiento de contraseña `POST /api/auth/reset-password`.**
El sistema deberá validar el token y actualizar la contraseña. Nuevo.
Criterios de aceptación:
- Cuando se reciba `POST /api/auth/reset-password` con `{ token, password }`, el sistema deberá buscar un usuario con `resetToken = token` y `resetTokenExpiry > fecha actual`.
- Cuando el token no exista o haya expirado, deberá responder `400` con "El enlace de restablecimiento es inválido o ha expirado."
- Cuando el token sea válido, deberá hashear la nueva contraseña con bcrypt (igual que en registro, 005/RF-x), actualizar `passwordHash`, limpiar `resetToken` y `resetTokenExpiry` (ponerlos a `null`), y responder `200` con `{ message: "Contraseña restablecida con éxito. Ya puedes iniciar sesión." }`.
- Cuando el token sea válido pero la contraseña sea inválida, deberá responder `400` con los errores de validación de Zod (sin actualizar nada).
- Cuando el restablecimiento tenga éxito, todas las sesiones activas del usuario deberán invalidarse (borrar la cookie de sesión o actualizar el token de sesión si aplica).

**RF-8 — Cliente de API en el frontend.**
El sistema deberá agregar funciones al cliente de API para el flujo de recuperación. Nuevo; extiende 005 (`authApi.ts`).
Criterios de aceptación:
- Cuando se inspeccione `apps/frontend/client/src/logic/authApi.ts`, deberá exponer `forgotPassword(email)` y `resetPassword(token, password)`, al estilo de las funciones existentes: `credentials: "include"`, respuestas validadas con los esquemas de `@tiendadcc/utils`, resultados discriminados (`ok` | `message`), sin lanzar excepciones al componente.
- Cuando el backend responda `200`, `400`, `429` o `500`, el cliente deberá traducirlo a un resultado con mensaje en español.
- Cuando se llame a `forgotPassword`, deberá validar el email con Zod antes de enviar.
- Cuando se llame a `resetPassword`, deberá validar token y password con Zod antes de enviar.

**RF-9 — Página `/recuperar-clave`.**
El sistema deberá ofrecer un formulario público para solicitar el restablecimiento. Nuevo.
Criterios de aceptación:
- Cuando un usuario acceda a `/recuperar-clave`, deberá mostrarse un formulario con "Correo electrónico" (campo con `label` asociado, `type="email"`, `autocomplete="email"`), un botón "Enviar enlace de restablecimiento", y un enlace "Volver al inicio de sesión" (→ `/iniciar-sesion`).
- Cuando el usuario envíe el formulario con un email válido, el botón deberá mostrar "Enviando…", deshabilitarse y no permitir doble envío.
- Cuando el backend responda `200`, deberá mostrarse el mensaje "Si el correo existe, recibirás un enlace para restablecer tu contraseña." con un enlace "Volver al inicio de sesión", sin revelar si el email existe.
- Cuando el backend responda `429`, deberá mostrarse "Has excedido el límite de solicitudes. Intenta más tarde." sin perder el email ingresado.
- Cuando el backend responda `500` o falle la red, deberá mostrarse "No se pudo enviar el correo. Intenta más tarde." con un botón "Reintentar".
- Cuando el email sea inválido, deberá mostrarse "Correo electrónico inválido." debajo del campo, el foco deberá ir al campo y no deberá enviarse la petición.

**RF-10 — Página `/resetear-clave/:token`.**
El sistema deberá ofrecer un formulario protegido por token para establecer una nueva contraseña. Nuevo.
Criterios de aceptación:
- Cuando un usuario acceda a `/resetear-clave/:token`, el sistema deberá validar el token con `GET /api/auth/validate-reset-token/:token` al cargar.
- Cuando el token sea inválido o haya expirado, deberá mostrarse "El enlace de restablecimiento es inválido o ha expirado." con un enlace "Solicitar otro enlace" (→ `/recuperar-clave`), sin mostrar el formulario.
- Cuando el token sea válido, deberá mostrarse un formulario con "Nueva contraseña" (campo con `label`, `type="password"`, `autocomplete="new-password"`), "Confirmar contraseña" (mismo tipo y `autocomplete`), un botón "Restablecer contraseña", y un enlace "Volver al inicio de sesión".
- Cuando el usuario envíe el formulario con contraseñas que no coincidan, deberá mostrarse "Las contraseñas no coinciden." debajo del campo de confirmación, el foco deberá ir al campo y no deberá enviarse la petición.
- Cuando el usuario envíe con contraseñas inválidas (no cumplen las reglas de registro), deberán mostrarse los errores por campo del esquema compartido en español, el foco deberá ir al primer campo con error y no deberá enviarse la petición.
- Cuando el envío esté en curso, el botón deberá mostrar "Restableciendo…", deshabilitarse y no permitir doble envío.
- Cuando el backend responda `200`, deberá navegarse a `/iniciar-sesion` con el aviso "Contraseña restablecida con éxito. Ya puedes iniciar sesión." (`role="status"`).
- Cuando el backend responda `400` (token inválido/expirado), deberá mostrarse "El enlace de restablecimiento es inválido o ha expirado." con un enlace "Solicitar otro enlace".
- Cuando falle la red, deberá mostrarse "No se pudo restablecer la contraseña. Intenta más tarde." con un botón "Reintentar".

**RF-11 — Enlace "¿Olvidaste tu contraseña?" en el login.**
El sistema deberá agregar un enlace en el login view para acceder al flujo de recuperación. Modifica 005 (login view).
Criterios de aceptación:
- Cuando se inspeccione `apps/frontend/client/src/pages/LoginPage.tsx` (o el componente de login), deberá existir un enlace "¿Olvidaste tu contraseña?" (→ `/recuperar-clave`) debajo del botón "Iniciar sesión", con `aria-label` opcional para mayor claridad.
- Cuando el usuario haga clic en el enlace, deberá navegarse a `/recuperar-clave`.
- Cuando el usuario esté en `/recuperar-clave` o `/resetear-clave/:token`, el enlace "Volver al inicio de sesión" deberá navegar a `/iniciar-sesion`.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final en español, incluidos mensajes de error, validación y correos electrónicos (constitución §6). Identificadores en inglés (`resetToken`, `forgotPassword`, `SMTP_HOST`).
- **RNF-2 Backend real y separación de capas.** Toda la lógica de generación de tokens, envío de correos y actualización de contraseñas vive en `services/` del backend (constitución §3, §5). El frontend solo presenta y llama al cliente de API.
- **RNF-3 Seguridad.** Tokens criptográficamente seguros (32 bytes, 64 caracteres hex); contraseñas hasheadas con bcrypt (igual que en registro, 005/RF-x); rate limiting para prevenir abusos; no revelar si un email existe (prevención de enumeración); tokens de un solo uso (se limpian tras el restablecimiento); enlaces con expiración de 15 minutos; CORS y cookies `httpOnly` sin cambios (005/RF-x).
- **RNF-4 Desempeño.** El envío de correo es asíncrono y no bloquea la respuesta (se responde `200` tras encolar el correo, no tras enviarlo). Los tokens se buscan por índice único en MongoDB.
- **RNF-5 Dependencias.** Se agregan `nodemailer` y `@types/nodemailer` para el envío de correos, y `express-rate-limit` para la limitación de tasa (constitución §1). Sin otras dependencias nuevas.
- **RNF-6 Sistema de diseño "IDE institucional".** Formularios con primitivas `Input`, `Label`, `Button` (00/RNF-6, 005/RNF-x), `font-sans` en campos y mensajes, errores en `destructive` con texto, foco con `ring`, sin animaciones en formularios (00/RF-7).
- **RNF-7 Accesibilidad.** Campos con `label`, `aria-invalid` y `aria-describedby`; errores en `role="alert"`; avisos de éxito en `role="status"`; estados de carga anunciados (`aria-busy`); nada depende solo del color; operable por teclado; contraste AA.
- **RNF-8 Responsividad.** Desde 360 px sin desplazamiento horizontal: formularios en una columna, botones a ancho completo, enlaces visibles.
- **RNF-9 Tests.** Lógica de negocio con tests (constitución §4): esquemas de `utils` (email, password, token); rutas con supertest + `mongodb-memory-server` (`200`, `400`, `429`, `500`, token válido e inválido, expiración, rate limiting, limpieza de token tras restablecimiento); servicio de email con mock de Nodemailer; frontend (`authApi`, `forgotPassword`, `resetPassword`, y smoke de `/recuperar-clave` y `/resetear-clave/:token`). `npm run check` de raíz verifica todo.

## Casos límite

- Email con espacios al inicio o final: se hace `trim` antes de buscar (cubierto por RF-5).
- Email en mayúsculas: se busca case-insensitive (cubierto por RF-3).
- Token con caracteres no hex: se rechaza como inválido (cubierto por RF-6).
- Token de 63 o 65 caracteres: se rechaza como inválido (cubierto por RF-6).
- Token válido pero expirado hace 1 segundo: se rechaza como inválido (cubierto por RF-6, RF-7).
- Token usado dos veces: la segunda vez se rechaza porque se limpió tras el primer uso (cubierto por RF-7).
- Dos solicitudes de restablecimiento para el mismo email en 10 minutos: la segunda sobrescribe el token anterior (el primer enlace deja de funcionar, cubierto por RF-3).
- Usuario solicita restablecimiento 4 veces en 1 hora: la cuarta responde `429` (cubierto por RF-4).
- Usuario desde la misma IP solicita 6 veces en 1 hora (diferentes emails): la sexta responde `429` (cubierto por RF-4).
- Correo no llega tras 5 minutos: el usuario ve "No se pudo enviar el correo" si el backend respondió `500`, o no ve nada si el backend respondió `200` pero el SMTP falló en background (cubierto por RF-3, RNF-4).
- Usuario hace clic en el enlace del correo en otro navegador: funciona igual (cubierto por RF-10).
- Usuario cambia la contraseña desde `/resetear-clave/:token` mientras tiene sesión activa en otro dispositivo: la sesión se invalida (cubierto por RF-7).
- Token en la URL se comparte en redes sociales: cualquiera que lo use antes de 15 minutos puede restablecer la contraseña (mitigado por la expiración corta, RF-3).
- Email inválido en el formulario: se muestra error de validación sin enviar petición (cubierto por RF-9).
- Contraseñas que no coinciden en `/resetear-clave/:token`: se muestra error sin enviar petición (cubierto por RF-10).
- Usuario accede a `/resetear-clave/:token` con token válido, pero espera 20 minutos antes de enviar: el token expiró, se muestra mensaje de error (cubierto por RF-10).
- Backend sin configurar SMTP (variables de entorno faltantes): el proceso aborta al iniciar (cubierto por RF-2).

## Fuera de alcance

- Verificación de correo electrónico (el campo `emailVerified` existe pero no se usa en este flujo).
- Autenticación de dos factores (2FA) o recuperación de cuentas sin acceso al correo.
- Cambio de contraseña desde el perfil con la contraseña actual conocida.
- Bloqueo de cuentas tras intentos fallidos de login.
- Historial de restablecimientos de contraseña.
- Notificación al usuario de que alguien solicitó restablecer su contraseña (email de alerta).
- Soporte para múltiples tokens activos simultáneos (solo uno por usuario).
- Plantillas de correo HTML personalizables (se envía texto plano con el enlace).
- Internacionalización (i18n) de los correos (solo español).

## Criterios de finalización

Esta tarea se considera terminada cuando:

1. El modelo `User` incluye `resetToken` y `resetTokenExpiry` con índices y validación (RF-1).
2. Las variables de entorno SMTP están configuradas, validadas con Zod y documentadas en `.env.example` (RF-2).
3. `POST /api/auth/forgot-password` genera un token seguro, lo guarda, envía un correo con el enlace, y responde `200` sin revelar si el email existe (RF-3).
4. El rate limiting funciona: máximo 3 solicitudes por email y 5 por IP por hora, con respuesta `429` y header `Retry-After` (RF-4).
5. Los esquemas de validación viven en `@tiendadcc/utils` y se usan en frontend y backend (RF-5).
6. `GET /api/auth/validate-reset-token/:token` valida si un token es válido y no ha expirado (RF-6).
7. `POST /api/auth/reset-password` valida el token, actualiza la contraseña, limpia el token, e invalida las sesiones activas (RF-7).
8. `authApi.ts` expone `forgotPassword(email)` y `resetPassword(token, password)` con validación Zod y resultados discriminados (RF-8).
9. `/recuperar-clave` muestra un formulario accesible, maneja estados de carga, error y éxito, y no revela si el email existe (RF-9).
10. `/resetear-clave/:token` valida el token al cargar, muestra un formulario accesible, maneja estados de carga, error y éxito, y navega a `/iniciar-sesion` con aviso (RF-10).
11. El login view incluye un enlace "¿Olvidaste tu contraseña?" (→ `/recuperar-clave`) (RF-11).
12. Existen los tests de RNF-9 y la UI cumple diseño, accesibilidad y responsividad (RNF-6–RNF-8).
13. `npm run check` pasa sin errores.

## Dudas abiertas

- [RESUELTO] Número de spec: **010** (siguiente libre tras 009); carpeta `specs/010-password-recovery/`.
- [RESUELTO] Flujo con envío real de correo vía SMTP (Nodemailer), no simulado.
- [RESUELTO] Rutas separadas: `/recuperar-clave` y `/resetear-clave/:token`, no dentro del login view.
- [RESUELTO — decisión de esta spec, revisar] Token con expiración de **15 minutos**.
- [RESUELTO — decisión de esta spec, revisar] Rate limiting: **3 solicitudes por email por hora** y **5 por IP por hora**.
- [RESUELTO — decisión de esta spec, revisar] Nuevas dependencias: `nodemailer`, `@types/nodemailer`, `express-rate-limit`.
- [RESUELTO — decisión de esta spec, revisar] El sistema no revela si un email existe (prevención de enumeración).
- [RESUELTO — decisión de esta spec, revisar] Tras restablecer, las sesiones activas se invalidan.
- [RESUELTO — decisión de esta spec, revisar] Solo un token activo por usuario (el nuevo sobrescribe el anterior).
- [PENDIENTE — fuera de esta spec] Verificación de correo electrónico (campo `emailVerified` ya existe).
- [PENDIENTE — fuera de esta spec] Autenticación de dos factores.
- [PENDIENTE — fuera de esta spec] Plantillas de correo HTML con logo y estilos.
