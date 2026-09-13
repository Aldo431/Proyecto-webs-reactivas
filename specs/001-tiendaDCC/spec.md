# Spec 001 — Página de inicio y accesos de autenticación (frontend)

## Contexto y objetivo
La primera funcionalidad de tiendaDCC es una **página web solo frontend** que actúe como escaparate inicial: muestra la marca "TiendaDCC", una breve descripción, una vista previa de productos de ejemplo y los accesos "Registrarse ahora" e "Iniciar sesión". Estos accesos navegan a páginas de formulario (registro completo / login mínimo) que **aún no funcionan**: su envío no valida ni envía nada. No hay backend, autenticación ni persistencia en esta fase; el objetivo es fijar la estructura y el flujo de navegación básico de la tienda.

## Usuarios
- **Visitante / comprador potencial**: persona que llega a la página, explora la marca y los productos de ejemplo, y accede (sin éxito aún) a registro o inicio de sesión.
- **Desarrollador /s**: (implícito) quien consume la spec para implementar; requiere criterios verificables.

## Historias de usuario
- Como visitante, quiero ver el logo "TiendaDCC" y una descripción del sitio al entrar, para saber qué es la tienda.
- Como visitante, quiero ver una vista previa de productos de ejemplo, para hacerme una idea de lo que se vende.
- Como visitante, quiero poder iniciar el proceso de registro o de inicio de sesión desde el inicio, aunque aún no funcione.
- Como visitante, quiero poder volver al inicio desde cualquier página, para no perderme.

## Requisitos funcionales

**RF-1 — Página de inicio con marca y accesos.**
Cuando el usuario acceda a la página de inicio, el sistema deberá mostrar el logo y el nombre "TiendaDCC", una breve descripción del sitio y los accesos "Registrarse ahora" e "Iniciar sesión".
Criterios de aceptación:
- Cuando la página de inicio se cargue correctamente, deberá mostrarse "TiendaDCC" como elemento principal.
- Cuando la página de inicio se cargue correctamente, deberá mostrarse una breve descripción de la tienda (venta de productos del DCC).
- Cuando la página de inicio se cargue correctamente, deberán mostrarse los accesos "Registrarse ahora" e "Iniciar sesión".

**RF-2 — Acceso a registro.**
Cuando el usuario haga clic en "Registrarse ahora", el sistema deberá navegar a la página de registro.
Criterios de aceptación:
- Cuando el usuario active "Registrarse ahora" desde el inicio, deberá presentarse la página de registro sin recargar el sitio.
- Cuando el usuario active "Registrarse ahora", el inicio de sesión no deberá abrirse.

**RF-3 — Acceso a inicio de sesión.**
Cuando el usuario haga clic en "Iniciar sesión", el sistema deberá navegar a la página de inicio de sesión.
Criterios de aceptación:
- Cuando el usuario active "Iniciar sesión" desde el inicio, deberá presentarse la página de inicio de sesión sin recargar el sitio.
- Cuando el usuario active "Iniciar sesión", el registro no deberá abrirse.

**RF-4 — Formulario de registro.**
Mientras el usuario esté en la página de registro, el sistema deberá mostrar un formulario con los campos: nombre, correo electrónico, contraseña y confirmación de contraseña.
Criterios de aceptación:
- Cuando la página de registro se cargue, deberá mostrar un campo para el nombre.
- Cuando la página de registro se cargue, deberá mostrar un campo para el correo electrónico.
- Cuando la página de registro se cargue, deberá mostrar un campo para la contraseña.
- Cuando la página de registro se cargue, deberá mostrar un campo para confirmar la contraseña.
- Cuando el usuario envíe el formulario de registro, el sistema no deberá validar ni enviar datos (sin acción).

**RF-5 — Formulario de inicio de sesión.**
Mientras el usuario esté en la página de inicio de sesión, el sistema deberá mostrar un formulario con los campos: correo electrónico y contraseña.
Criterios de aceptación:
- Cuando la página de inicio de sesión se cargue, deberá mostrar un campo para el correo electrónico.
- Cuando la página de inicio de sesión se cargue, deberá mostrar un campo para la contraseña.
- Cuando el usuario envíe el formulario de inicio de sesión, el sistema no deberá validar ni enviar datos (sin acción).

**RF-6 — Vista previa de productos.**
Mientras el usuario esté en la página de inicio, el sistema deberá mostrar una grilla de productos de ejemplo estáticos (p. ej. tazas, poleras, stickers) con su nombre e imagen.
Criterios de aceptación:
- Cuando la página de inicio se cargue, deberá mostrarse la sección de productos de ejemplo.
- Cuando la página de inicio se cargue, cada producto de ejemplo deberá mostrar al menos su nombre e imagen.
- Cuando el usuario haga clic en un producto de ejemplo, el sistema no deberá navegar a otra vista. [NECESITA ACLARACIÓN: el clic en productos no se consultó; asumido sin efecto]

**RF-7 — Regreso al inicio.**
Cuando el usuario esté en una página de formulario, el sistema deberá ofrecer un botón "Volver" que lo lleve al inicio; cuando el usuario haga clic en el logo "TiendaDCC" desde cualquier página, el sistema deberá llevarlo al inicio.
Criterios de aceptación:
- Cuando el usuario haga clic en "Volver" desde registro o inicio de sesión, deberá presentarse la página de inicio.
- Cuando el usuario haga clic en el logo "TiendaDCC" desde cualquier página, deberá presentarse la página de inicio.

**RF-8 — Acceso directo por URL.**
Cuando el usuario acceda directamente por URL a la página de registro o de inicio de sesión (sin pasar por el inicio), el sistema deberá mostrar la página correspondiente.
Criterios de aceptación:
- Cuando el usuario acceda por URL a la página de registro, deberá mostrarse el formulario de registro.
- Cuando el usuario acceda por URL a la página de inicio de sesión, deberá mostrarse el formulario de inicio de sesión.
- Cuando el usuario recargue (F5) cualquiera de las páginas, deberá mantenerse en la misma página.

## Requisitos no funcionales

- **RNF-1 Idioma.** Todo texto orientado al usuario final deberá estar en español (constitución, §6).
- **RNF-2 Sin backend ni persistencia.** El sistema no deberá realizar llamadas de red, no deberá consultar ni persistir datos, y no deberá requerir backend para su funcionamiento.
- **RNF-3 Responsividad.** Cuando la página se visualice en escritorio o móvil, el sistema deberá adaptar el diseño sin romper el contenido.
- **RNF-4 Accesibilidad.** Todos los accesos y campos deberán ser alcanzables y operables mediante teclado y con etiquetas claras.
- **RNF-5 Desempeño.** Cuando el usuario navegue entre páginas, la transición deberá ser inmediata, sin recarga completa del sitio.
- **RNF-6 Sin dependencias nuevas.** No se deben agregar dependencias fuera del stack definido (constitución, §1). Como excepción sancionada en esta spec, se permiten las dependencias de desarrollo del runner de tests y utilidades de render: Vitest, jsdom y @testing-library/react.
- **RNF-7 Tests.** Mientras no exista lógica de negocio, no deberá exigirse cobertura; `npm run check` deberá pasar antes de dar por terminada la tarea (constitución, §4).

## Casos límite
- Acceso directo (URL) o recarga en cualquiera de las tres páginas: la página debe mostrarse igualmente sin errores (cubierto por RF-8).
- Envío de formularios con campos vacíos, incompletos o con datos absurdos: sin acción, sin mensajes de error (RF-4/RF-5).
- Pulsaciones repetidas sobre "Registrarse ahora", "Iniciar sesión" o "Volver": navegan a la misma vista sin duplicar o encolar acciones.
- Vista previa con exactamente un producto o con varios: la grilla debe renderizar sin romperse en ningún caso.
- Reducción del tamaño de pantalla con la grilla de productos: el diseño debe reordenarse (RNF-3).
- Sin conexión a internet: el funcionamiento debe ser idéntico, por ser contenido estático (RNF-2).

## Fuera de alcance
- Autenticación real, sesiones, registro/login funcionales o persistencia de usuarios.
- Validación de los formularios (ni en cliente ni en servidor).
- Backend (Hono), base de datos (MongoDB/Mongoose) y cualquier API.
- Catálogo real de productos, detalle de producto, carrito, checkout ni pagos.
- Gestión de errores de red (no hay red).
- Despliegue ni entorno de producción.

## Criterios de finalización
Esta tarea se considera terminada cuando:
1. La página de inicio muestra "TiendaDCC" como elemento principal, la descripción de la tienda y los accesos "Registrarse ahora" e "Iniciar sesión".
2. La vista previa muestra una grilla de productos de ejemplo estáticos con nombre e imagen.
3. "Registrarse ahora" lleva a un formulario con nombre, correo, contraseña y confirmación; "Iniciar sesión" lleva a un formulario con correo y contraseña.
4. El envío de ambos formularios no produce ninguna acción (no valida, no envía, no persiste).
5. El botón "Volver" y el logo clicable permiten volver al inicio desde cualquier página.
6. El acceso directo por URL y la recarga funcionan en las tres vistas.
7. `npm run check` pasa sin errores.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Botones de envío de los formularios: ¿aparecen deshabilitados o habilitados pero sin efecto al hacer clic?
- [NECESITA ACLARACIÓN] Clic en un producto de la vista previa: ¿sin efecto (asumido) o con alguna retroalimentación?
- [NECESITA ACLARACIÓN] ¿El campo "confirmación de contraseña" debe indicar de algún modo (p. ej. visual) si coincide antes del envío, o es puramente decorativo?
- [NECESITA ACLARACIÓN] ¿Existe una pauta de paleta/branding del DCC para el diseño, o se usa el estilo por defecto de Tailwind?
  - [RESUELTO] Paleta aplicada: escala de azul institucional U. de Chile (brand) con acento rojo (accent), definida en el tema de estilos de la spec 001.