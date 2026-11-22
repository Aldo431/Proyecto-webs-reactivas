# Spec 018 — Verificación en dos pasos por correo

## Contexto y objetivo
El Hito 3 asignó a este equipo la funcionalidad de **2FA opcional por correo**. Hoy el login de `POST /api/auth/login` valida contraseña y entrega la cookie de sesión en un solo paso (spec 005), y el perfil permite cambiar correo y contraseña (spec 006/010). La spec 010 de recuperación de contraseña excluyó explícitamente la 2FA; esta spec la incorpora sin obligar a ningún usuario a activarla.

El mecanismo elegido es un **código de 6 dígitos enviado al correo**: no requiere que el usuario instale una app autenticadora, reutiliza `nodemailer` (ya presente) y sigue el patrón de `devToken` de la recuperación para poder probarlo sin SMTP real. Al activarlo, el login pasa a dos pasos: contraseña → código → cookie de sesión.

Lo que NO incluye: TOTP con app autenticadora, códigos de respaldo, "recordar este dispositivo", SMS, 2FA obligatoria para administradores, cambios en el proveedor de correo, despliegue en `fullstack.dcc.uchile.cl` ni nuevas dependencias.

## Usuarios
- **Usuario/a que activa 2FA**: decide voluntariamente proteger su cuenta con un código por correo.
- **Usuario/a sin 2FA**: continúa con el login de un solo paso, sin cambios observables.
- **Atacante con la contraseña**: no deberá obtener una sesión sin el código enviado al correo de la víctima.
- **Desarrollador/es** (implícito): consume los esquemas Zod y los resultados discriminados del cliente API.

## Historias de usuario
- Como usuario, quiero activar la verificación en dos pasos desde mi perfil, para proteger mi cuenta sin instalar nada.
- Como usuario con 2FA, quiero que me pidan un código después de mi contraseña, para que un robo de contraseña no baste para entrar.
- Como usuario con 2FA, quiero reenviar el código si no me llegó, para no quedarme fuera de mi cuenta.
- Como usuario, quiero poder desactivar la 2FA con mi contraseña y un código, para recuperar el acceso si cambio de correo.
- Como desarrollador, quiero que el código sea temporal y de un solo uso, para evitar reintentos indefinidos.

## Requisitos funcionales

**RF-1 — Activación opcional desde el perfil.**
El sistema deberá permitir a un usuario autenticado activar la verificación en dos pasos tras confirmar un código enviado a su correo.
Criterios de aceptación:
- Cuando un usuario autenticado solicite activar la 2FA, el sistema deberá generar un código de 6 dígitos, enviarlo a su correo, guardar solo su hash con expiración de 10 minutos y responder `202` con un mensaje en español.
- Cuando la solicitud se realice en `development` o `test`, la respuesta deberá incluir el campo `devCode` con el código generado; cuando `NODE_ENV` sea `production`, no deberá incluirlo.
- Cuando el usuario confirme el código correcto antes de la expiración, el sistema deberá fijar `mfaEnabled: true` en su cuenta, marcar el desafío como usado y responder `200`.
- Cuando el código sea incorrecto, haya expirado o el desafío ya esté usado, el sistema deberá responder `400` con un mensaje en español y no deberá activar la 2FA.
- Cuando el usuario ya tenga la 2FA activa, la solicitud de activación deberá responder `409` con un mensaje en español.

**RF-2 — Login en dos pasos.**
El sistema deberá exigir un segundo factor a los usuarios que tengan activa la 2FA, sin entregar la cookie de sesión hasta verificarlo.
Criterios de aceptación:
- Cuando un usuario con 2FA envíe contraseña válida a `POST /api/auth/login`, el sistema deberá crear un desafío de login con expiración de 5 minutos, enviar el código por correo y responder `200` con `{ mfaRequired: true, challengeId, message }` sin establecer la cookie de sesión.
- Cuando un usuario sin 2FA inicie sesión, el sistema deberá responder exactamente como hoy: `200` con el usuario público y la cookie de sesión.
- Cuando la contraseña sea incorrecta, el sistema deberá responder `401` con "Correo o contraseña incorrectos." y no deberá revelar si el usuario tiene 2FA.
- Cuando se envíe un `challengeId` inexistente, ajeno a otro usuario o ya usado al verificar, el sistema deberá responder `400` y no deberá establecer la cookie.
- Cuando el código de login sea correcto, el sistema deberá establecer la cookie de sesión y responder `200` con el usuario público, incluido `mfaEnabled: true`.

**RF-3 — Verificación y reenvío del código.**
El sistema deberá limitar la vida útil y los intentos de cada código, y permitir reenviarlo de forma controlada.
Criterios de aceptación:
- Cuando el código enviado sea correcto y esté vigente, el sistema deberá marcar el desafío como usado y no deberá aceptarlo en una segunda verificación.
- Cuando se acumulen 5 intentos fallidos sobre un desafío, el sistema deberá responder `429`, invalidarlo y exigir un nuevo login o nueva solicitud.
- Cuando el código haya expirado, el sistema deberá responder `400` con un mensaje en español e indicar que debe solicitar uno nuevo.
- Cuando un usuario autenticado o un desafío de login válido solicite reenviar el código, el sistema deberá generar uno nuevo, invalidar el anterior y responder `202`.
- Cuando se superen 3 reenvíos en una hora para el mismo desafío o correo, el sistema deberá responder `429` con el mensaje de límite ya usado por la API.

**RF-4 — Desactivación.**
El sistema deberá permitir desactivar la 2FA solo al usuario legítimo, exigiendo su contraseña y un código vigente.
Criterios de aceptación:
- Cuando un usuario con 2FA solicite desactivarla, el sistema deberá enviar un código a su correo y responder `202` con `devCode` fuera de producción.
- Cuando el usuario envíe el código correcto y su contraseña actual, el sistema deberá fijar `mfaEnabled: false`, marcar el desafío como usado y responder `200`.
- Cuando la contraseña sea incorrecta o el código inválido, el sistema deberá responder `401` o `400` respectivamente, y no deberá desactivar la 2FA.
- Cuando un usuario sin 2FA intente desactivarla, el sistema deberá responder `409` con un mensaje en español.

**RF-5 — Interfaz y navegación.**
La interfaz deberá permitir activar/desactivar la 2FA desde el perfil y completar el segundo paso del login sin recargar la página.
Criterios de aceptación:
- Cuando el perfil cargue, deberá mostrar el estado de la 2FA y un control para activarla o desactivarla, con textos en español.
- Cuando el login devuelva `mfaRequired: true`, la aplicación deberá navegar a `#/verificar-clave` sin considerar la sesión iniciada y sin conservar la contraseña en el estado global.
- Cuando el usuario acierte el código en `#/verificar-clave`, la aplicación deberá actualizar el store de sesión y continuar hacia la ruta protegida original si venía de una guardia.
- Cuando un visitante abra `#/verificar-clave` directamente sin desafío vigente, deberá ser redirigido a `#/iniciar-sesion`.
- Cuando falle el código, el campo deberá mostrar un mensaje en español con `role="alert"`, conservar lo escrito y permitir reenviar el código.
- Cuando se use atrás/adelante del navegador durante el flujo, las URLs `#/iniciar-sesion` y `#/verificar-clave` deberán corresponder a sus vistas sin recarga completa.

## Requisitos no funcionales
- **RNF-1 Idioma.** Todo texto orientado al usuario final, incluidos correos y mensajes de error, deberá estar en español (constitución §6). Los identificadores de código van en inglés.
- **RNF-2 Stack.** Se respeta React 19 + Vite, Express, MongoDB/Mongoose, Tailwind v4 + shadcn/Radix y Zod (constitución §1). No se agrega ninguna dependencia: se reutilizan `crypto`, `nodemailer`, `express-rate-limit` y `bcryptjs` ya presentes.
- **RNF-3 Seguridad.** Los códigos se almacenan hasheados con SHA-256, se comparan con `timingSafeEqual`, tienen un solo uso, expiran en 5 o 10 minutos según el propósito y nunca se registran en logs. `devCode` solo se devuelve cuando `NODE_ENV !== "production"`.
- **RNF-4 Separación lógica/UI.** La generación, validación y expiración del código viven en servicios del backend y en esquemas Zod de `utils/`; los componentes solo presentan resultados (constitución §3).
- **RNF-5 Tests.** El servicio de códigos, los esquemas y las rutas deberán tener tests unitarios y de integración; el flujo completo deberá tener tests E2E (constitución §4).
- **RNF-6 Diseño y router.** La nueva vista respeta `specs/00-design-system/spec.md`, usa `HashRouter` y componentes de `ui/`, con foco visible, movimiento reducido y sin estilos literales.
- **RNF-7 Compatibilidad.** Los usuarios sin 2FA y los tests existentes de login, guardias y carrito conservan su comportamiento sin cambios.

## Casos límite
- Código con menos o más de 6 dígitos, letras o espacios: se rechaza con `400` antes de consumir un intento (RF-3).
- Código correcto reutilizado: se rechaza porque el desafío ya está usado (RF-3).
- 5 intentos fallidos: `429` e invalidación del desafío (RF-3).
- 3 reenvíos en una hora: `429` con el mensaje de límite (RF-3).
- `challengeId` de otro usuario: `400`, sin establecer cookie (RF-2).
- El usuario cambia de correo después de activar la 2FA: el código se envía al correo nuevo y la verificación de alumno (spec 017) se resetea de forma independiente.
- Fallo SMTP: la solicitud responde `500` con mensaje en español y no deja un desafío utilizable.
- Recarga de `#/verificar-clave`: el desafío sigue en el servidor, pero el cliente sin `challengeId` redirige al login (RF-5).
- Navegación con atrás/adelante entre login y verificación: cada URL muestra su vista (RF-5).

## Fuera de alcance
- TOTP con Google Authenticator, Authy u otras apps; SMS; códigos de respaldo; llaves de seguridad.
- 2FA obligatoria o aplicación solo a roles admin.
- "Recordar este dispositivo" y sesiones largas distintas a las actuales.
- Cambios al proveedor de correo, SMTP en producción o despliegue.
- Modificación de las specs 015, 016 o 017; sus suites E2E sí se amplían con archivos nuevos.
- Instalación de librerías nuevas o cambios al design system.

## Criterios de finalización
1. Un usuario puede activar y desactivar la 2FA desde su perfil con un código por correo (RF-1, RF-4).
2. Un usuario con 2FA necesita contraseña + código para obtener la cookie; uno sin 2FA no nota cambios (RF-2, RNF-7).
3. Los códigos son de un solo uso, expiran, limitan intentos y reenvíos, y nunca se almacenan en claro (RF-3, RNF-3).
4. La vista `#/verificar-clave` funciona con `HashRouter`, guardias, back/forward y recarga controlada (RF-5).
5. No se agregaron dependencias ni se modificó el design system (RNF-2, RNF-6).
6. Hay tests unitarios, de integración y E2E del flujo completo (RNF-5).
7. `npm run check` pasa sin errores.

## Dudas abiertas
- [RESUELTO] Mecanismo: código de 6 dígitos por correo, sin aplicación externa.
- [RESUELTO] Alcance: opcional por usuario, activable y desactivable desde el perfil.
- [RESUELTO] Pruebas: `devCode` se devuelve solo en development/test, igual que `devToken` de recuperación.
- [RESUELTO] El login de un solo paso queda intacto para usuarios sin 2FA y para los tests existentes.
- [RESUELTO] Despliegue y SMTP de producción quedan fuera de alcance.
