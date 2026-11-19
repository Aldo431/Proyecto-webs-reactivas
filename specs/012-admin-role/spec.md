# Spec 012 — Rol de administrador

## Contexto y objetivo
Hoy todas las cuentas de TiendaDCC son iguales: el modelo `User` no tiene rol y la API solo distingue entre "con sesión" (`requireAuth`) y "sin sesión". Para el hito 3 la tienda necesita un **panel de administración** (mockups en el lienzo "TiendaDCC · Mockups dashboard administrador": Resumen, Productos, Usuarios y Reseñas).

Esta spec define **solo la base** de ese panel:
1. un **rol** por cuenta (`user` o `admin`), guardado en MongoDB;
2. la **autorización** en el backend (`requireAdmin`) y en el frontend (ruta solo para administradores);
3. una forma de **crear el primer administrador** sin tocar la base a mano;
4. el **armazón** del panel en `#/admin` (barra lateral y navegación entre secciones), que las specs siguientes llenarán.

Lo que NO incluye aún: el contenido de las secciones (indicadores, tablas de productos, usuarios y reseñas), cambiar el rol desde la interfaz, ni métricas de ventas (la tienda no registra ventas: el pago de la spec 011 es simulado y no guarda órdenes).

## Usuarios
- **Administrador**: integrante del equipo que gestiona la tienda (destacados, moderación, cuentas).
- **Usuario registrado**: cualquier otra cuenta; no debe ver ni usar el panel.
- **Visitante anónimo**: sin sesión.
- **Desarrollador/es**: necesita crear un administrador en su base local para probar y presentar.

## Historias de usuario
- Como administrador, quiero entrar a `#/admin` desde el encabezado, para gestionar la tienda.
- Como usuario normal, quiero que el panel no aparezca en mi interfaz, para no ver opciones que no puedo usar.
- Como equipo, queremos que la API rechace las acciones de administración a quien no sea administrador, aunque llame a la API directamente.
- Como desarrollador, quiero convertir una cuenta en administradora con un comando, para no editar MongoDB a mano.

## Requisitos funcionales

**RF-1 — Rol en el modelo de usuario.**
Cada cuenta deberá tener un rol con valor `"user"` o `"admin"`.
Criterios de aceptación:
- Cuando se registre una cuenta nueva, su rol deberá ser `"user"`.
- Cuando un documento creado antes de esta spec no tenga el campo `role`, deberá tratarse como `"user"` sin script de migración (mismo criterio que 006 D2).
- Cuando se guarde un rol distinto de `"user"` o `"admin"`, Mongoose deberá rechazarlo.
- Los valores válidos deberán definirse una sola vez en `@tiendadcc/utils` (`USER_ROLES`, `userRoleSchema`).

**RF-2 — El rol no se puede asignar desde la API pública.**
Ningún endpoint existente deberá permitir que un usuario fije o cambie su propio rol.
Criterios de aceptación:
- Cuando `POST /api/auth/register` reciba `"role": "admin"` en el cuerpo, la cuenta deberá crearse con rol `"user"`.
- Cuando `PUT /api/users/me` reciba `"role": "admin"`, el rol deberá quedar sin cambios.

**RF-3 — El rol se expone en la sesión.**
El usuario público (`PublicUser`) deberá incluir el rol.
Criterios de aceptación:
- Cuando se llame a `GET /api/auth/me`, `POST /api/auth/login` o `POST /api/auth/register`, la respuesta deberá incluir `role`.
- `publicUserSchema` deberá incluir `role: userRoleSchema` como campo obligatorio.
- Cuando el rol de una cuenta cambie en la base, la siguiente solicitud autenticada deberá reflejarlo sin volver a iniciar sesión (el rol se lee de MongoDB en cada solicitud, no se guarda en el JWT).

**RF-4 — Middleware `requireAdmin`.**
El backend deberá tener un middleware que solo deje pasar a administradores.
Criterios de aceptación:
- Cuando la solicitud no tenga sesión válida, deberá responder **401** con el mensaje de `requireAuth` ("Debes iniciar sesión.").
- Cuando la sesión sea de una cuenta con rol `"user"`, deberá responder **403** con "Solo un administrador puede realizar esta acción.".
- Cuando la sesión sea de un administrador, deberá continuar al siguiente manejador.
- Deberá montarse en un enrutador nuevo `/api/admin`, que en esta spec expone solo `GET /api/admin/session` → `200 { "role": "admin" }`, para verificar el acceso de punta a punta. Las specs siguientes agregan sus rutas a ese enrutador.

**RF-5 — Crear el primer administrador por línea de comandos.**
Deberá existir el comando `npm run make-admin -w backend -- <correo>`.
Criterios de aceptación:
- Cuando el correo pertenezca a una cuenta existente, su rol deberá pasar a `"admin"` y deberá imprimirse "Listo: <usuario> ahora es administrador.".
- Cuando la cuenta ya sea administradora, no deberá fallar y deberá imprimirse "<usuario> ya era administrador.".
- Cuando no exista una cuenta con ese correo, deberá imprimirse "No existe una cuenta con el correo <correo>." y terminar con código de salida 1.
- Cuando falte el argumento o no sea un correo válido, deberá imprimirse un mensaje de uso en español y terminar con código 1 sin conectarse a la base.
- Cuando falte `MONGODB_URI`, deberá abortar con mensaje en español antes de conectar (como `seedEnv`).
- El correo se compara en minúsculas y sin espacios (como lo guarda el modelo).

**RF-6 — Ruta `#/admin` solo para administradores.**
El frontend deberá tener un guard `OnlyAdminRoute`.
Criterios de aceptación:
- Mientras la sesión se esté restaurando (`loading`), no deberá renderizar nada.
- Cuando el visitante sea anónimo, deberá redirigir a `/iniciar-sesion` con `state.from` (mismo comportamiento que `OnlyAuthenticatedRoute`, 011 RF-2).
- Cuando la sesión sea de un usuario con rol `"user"`, deberá redirigir a `/` con `replace`.
- Cuando la sesión sea de un administrador, deberá renderizar el contenido.

**RF-7 — Armazón del panel.**
Mientras un administrador esté en `#/admin` o en sus subrutas, el sistema deberá mostrar el diseño del mockup: barra lateral con la marca y la insignia "admin", navegación (Resumen, Productos, Usuarios, Reseñas), "Volver a la tienda" y la tarjeta del administrador con su `displayName` y `@username`.
Criterios de aceptación:
- Rutas: `#/admin` (Resumen), `#/admin/productos`, `#/admin/usuarios`, `#/admin/resenas`. Las cuatro usan el mismo `AdminLayout`.
- El enlace de la sección actual deberá tener `aria-current="page"` y el estilo activo del mockup (fondo `ink-800`, borde izquierdo `primary`).
- La navegación deberá ser un `<nav aria-label="Administración">`.
- En esta spec, cada sección muestra solo su título (`h1`) y una línea de descripción; su contenido llega en la spec 013.
- Desde 360 px de ancho no deberá haber desplazamiento horizontal: bajo 768 px, la barra lateral pasa a ser una fila de pestañas horizontales con desplazamiento propio (vista "Resumen en móvil" del mockup).
- "Volver a la tienda" deberá llevar a `/`.

**RF-8 — Acceso desde el encabezado.**
El encabezado de la tienda deberá mostrar el enlace "Administración" a `#/admin` solo a administradores.
Criterios de aceptación:
- Cuando la sesión sea de un administrador, deberá verse "Administración" en la navegación de escritorio y en el menú hamburguesa.
- Cuando el visitante sea anónimo o un usuario normal, el enlace no deberá estar en el DOM.

## Requisitos no funcionales
- **RNF-1 Idioma.** Textos al usuario en español; identificadores en inglés (constitución §6).
- **RNF-2 Seguridad.** La autorización real vive en el backend; ocultar el enlace en el frontend es solo comodidad. El rol nunca sale del cuerpo de una solicitud.
- **RNF-3 Sin dependencias nuevas** (constitución §1).
- **RNF-4 Lógica separada de la interfaz** (constitución §3): la decisión de acceso (`canAccessAdmin(state)`) y el cambio de rol del script (`grantAdminRole`) son funciones testeables fuera de componentes y del script.
- **RNF-5 Sistema de diseño.** El armazón usa los tokens de `styles.css` (spec 00) y como máximo un guiño de terminal por vista.
- **RNF-6 Tests.** `npm run check` deberá pasar.

## Casos límite
- **Usuario degradado con el panel abierto:** su siguiente llamada a `/api/admin/*` recibe 403. El frontend no se refresca solo; al recargar, `OnlyAdminRoute` lo envía a `/`.
- **Cuenta legada sin `role`:** se comporta como `"user"` en la API, en el guard y en el encabezado.
- **`make-admin` con correo en mayúsculas o con espacios:** encuentra la cuenta igual.
- **Dos ejecuciones seguidas de `make-admin`:** la segunda informa que ya era administrador y termina con código 0.

## Fuera de alcance
- Contenido de Resumen, Productos, Usuarios y Reseñas (spec 013).
- Cambiar el rol desde la interfaz o por API (spec 013, sección Usuarios, con la regla de no poder quitarse el rol a uno mismo).
- Métricas de ventas u órdenes.
- Más roles que `user` y `admin`.

## Criterios de finalización
- RF-1 a RF-8 cumplidos y cubiertos por tests donde hay lógica.
- Prueba manual: con dos cuentas (una con `make-admin`), solo la administradora ve "Administración" y entra a `#/admin`; la otra es redirigida a `/` y recibe 403 en `GET /api/admin/session`.
- `npm run check` en verde.

## Dudas abiertas
- ¿El seed debería además dar rol de administrador al vendedor `tiendadcc`? Por ahora no: se usa `make-admin` con la cuenta de cada integrante, para no mezclar "vendedor de prueba" con "administrador".
