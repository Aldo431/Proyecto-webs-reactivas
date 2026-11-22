# Spec 016 — Pruebas end-to-end con Playwright

## Contexto y objetivo
El Hito 3 exige tests E2E con **Playwright** que cubran como mínimo
**login + acceso protegido** y **otro flujo, p. ej. un CRUD**, ubicados en una
carpeta independiente **`e2etests/`** y con instrucciones para ejecutarlos en un
README. Hoy el proyecto solo tiene tests unitarios y de integración (Vitest,
Testing Library, supertest).

Esta spec agrega una suite E2E que levanta el sistema completo (backend Express +
frontend Vite) contra una base de datos efímera y lo prueba desde un navegador
real, siguiendo la estructura de la cátedra 09 (proyecto npm separado y endpoint
de reinicio solo en modo test).

Lo que NO incluye: CI, pruebas visuales/de captura, pruebas contra el despliegue
en producción, navegadores distintos de Chromium.

## Usuarios
- **Desarrollador/es y equipo docente**: ejecutan `npm run e2e` y obtienen un
  resultado repetible sin instalar MongoDB.

## Requisitos funcionales

**RF-1 — Proyecto `e2etests/` independiente.**
El repositorio deberá contener la carpeta `e2etests/` como proyecto npm propio
con `@playwright/test`, `playwright.config.ts` y los tests en `e2etests/tests/`.
Criterios de aceptación:
- La carpeta no forma parte de los workspaces de la raíz (`npm install` y
  `npm run check` no descargan navegadores).
- Existen los scripts `test`, `test:ui`, `test:headed` y `test:report`.

**RF-2 — Sistema levantado por la suite.**
Cuando se ejecuten los tests, Playwright deberá levantar el backend en modo test
(`NODE_ENV=test`, MongoDB en memoria) en el puerto 3001 y el frontend Vite en el
puerto 5173.
Criterios de aceptación:
- Si alguno de los puertos ya está en uso, la suite deberá fallar con un mensaje
  claro en vez de reutilizar un servidor (evita apuntar a la base de desarrollo).

**RF-3 — Reinicio de la base para tests repetibles.**
Mientras `NODE_ENV` sea `test`, el backend deberá exponer `POST /api/testing/reset`,
que vacía usuarios, productos, reseñas, pedidos y contadores y responde `204`.
Criterios de aceptación:
- Cuando `NODE_ENV` sea distinto de `test`, la ruta no deberá existir (`404`).

**RF-4 — Caso mínimo 1: login + acceso protegido.**
Criterios de aceptación:
- Cuando un visitante abra `#/perfil`, deberá terminar en `#/iniciar-sesion`.
- Cuando inicie sesión con credenciales válidas, deberá volver a `#/perfil`.
- Cuando recargue (F5) `#/perfil` con sesión, deberá seguir en `#/perfil`.
- Cuando use atrás/adelante del navegador entre vistas, deberá ver la vista
  correspondiente a cada URL.
- Cuando ingrese una contraseña incorrecta, deberá ver
  "Correo o contraseña incorrectos." y seguir en el login.
- Cuando cierre sesión, `#/perfil` deberá volver a exigir login.
- Cuando un usuario sin rol admin abra `#/admin`, deberá ser enviado a inicio.

**RF-5 — Caso mínimo 2: CRUD de publicaciones.**
Criterios de aceptación:
- **Crear**: desde `#/publicar` (nombre, descripción, categoría, precio e imagen)
  el producto queda publicado y se ve el aviso "Tu producto se publicó.".
- **Listar**: el producto aparece en `#/mis-publicaciones` y en el detalle público.
- **Editar**: "Editar ‹nombre›" → "Guardar cambios" muestra "Cambios guardados." y
  el nombre nuevo.
- **Eliminar**: "Eliminar ‹nombre›" + confirmación muestra
  "Publicación eliminada." y el producto deja de listarse.

**RF-6 — Caso adicional: carrito con estado global.**
Criterios de aceptación:
- El carrito armado como invitado se conserva al iniciar sesión, se sincroniza
  con la cuenta y sobrevive a la recarga sin duplicar cantidades.

**RF-7 — Documentación.**
`e2etests/README.md` y el README global deberán explicar requisitos, instalación
y ejecución de la suite.

## Requisitos no funcionales
- **RNF-1**: dependencia nueva `@playwright/test` solo en `e2etests/`.
- **RNF-2**: selectores accesibles (`getByRole`, `getByLabel`), sin `data-testid`.
- **RNF-3**: cada test parte de una base vacía (independencia y orden libre).
- **RNF-4**: TypeScript estricto en `e2etests/`.

## Fuera de alcance
CI, Firefox/WebKit, pruebas sobre producción.
