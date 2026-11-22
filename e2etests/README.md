# Tests E2E — tiendaDCC

Pruebas end-to-end con [Playwright](https://playwright.dev/) (spec
`specs/016-e2e-tests/`). Prueban la aplicación completa desde un navegador
Chromium real: frontend Vite + backend Express + MongoDB.

Es un proyecto npm **independiente** de los workspaces de la raíz (como en la
cátedra 09): `npm install` y `npm run check` de la raíz no descargan navegadores.

## Qué se prueba

| Archivo | Flujo |
|---|---|
| `tests/auth.spec.ts` | **Login + acceso protegido**: redirección de `#/perfil` al login, vuelta a la ruta protegida tras iniciar sesión, sesión que sobrevive a F5, botones atrás/adelante, contraseña incorrecta, cierre de sesión, `#/admin` sin rol de administrador, login inaccesible con sesión. |
| `tests/products.spec.ts` | **CRUD de publicaciones**: crear desde `#/publicar` (con imagen), listar en `#/mis-publicaciones` y en el catálogo, editar, eliminar con confirmación y cancelar la eliminación. |
| `tests/cart.spec.ts` | **Carrito (estado global con Zustand)**: el carrito invitado se conserva al iniciar sesión, se sincroniza con la cuenta y sobrevive a la recarga sin duplicar. |
| `tests/promotions.spec.ts` | **Promociones y cuenta de alumno**: verificación con `devCode`, 20% en carrito/checkout/pedido, packs 3x2 y 2x15%, baja al cambiar el correo y CRUD admin. |
| `tests/mfa.spec.ts` | **Verificación en dos pasos**: activación desde el perfil, login en dos pasos, reenvío, código inválido, desactivación con contraseña y login de un usuario sin 2FA. |

## Cómo funciona

`playwright.config.ts` levanta el sistema antes de los tests (`webServer`):

1. **Backend** en `http://localhost:3001` con `npm run start:e2e -w backend`:
   `NODE_ENV=test` y una base **MongoDB en memoria** (`mongodb-memory-server`),
   por lo que **no hace falta tener MongoDB instalado** ni se toca la base de
   desarrollo. En este modo existe `POST /api/testing/reset`, que vacía la base;
   cada test lo llama en su `beforeEach` para partir de cero. También existen
`POST /api/testing/promotions` y `POST /api/testing/admin?email=…` para sembrar
las promociones por defecto y otorgar rol de administrador en los tests de Hito 3.
2. **Frontend** en `http://localhost:5173` con Vite (`npm run dev`), que proxya
   `/api` al backend.

Si alguno de esos puertos ya está ocupado (por ejemplo, porque tienes
`npm run dev` corriendo), la suite se detiene con un error en lugar de reutilizar
ese servidor. Cierra los servidores de desarrollo antes de ejecutarla.

## Requisitos

- Node.js ≥ 22.18 y npm ≥ 10 (el backend se ejecuta con `node src/*.ts`, que requiere el soporte nativo de TypeScript de Node).
- Dependencias de la raíz instaladas (`npm install` en la raíz del repositorio).
- La primera vez, `mongodb-memory-server` descarga el binario de MongoDB
  (necesita internet; queda en caché).

## Instalación (una vez)

Desde la raíz del repositorio:

```bash
npm install            # dependencias del proyecto (si no lo has hecho)
npm run e2e:install    # dependencias de e2etests/ + navegador Chromium
```

Equivalente, desde `e2etests/`:

```bash
npm install
npx playwright install chromium   # en Linux puede requerir: --with-deps
```

## Ejecución

Desde la raíz:

```bash
npm run e2e
```

Desde `e2etests/`:

```bash
npm test                 # todos los tests, sin ventana (headless)
npm run test:headed      # viendo el navegador
npm run test:ui          # modo interactivo de Playwright
npm run test:report      # abre el reporte HTML de la última ejecución
npx playwright test tests/auth.spec.ts        # un archivo
npx playwright test -g "elimina una publicación"   # un test por nombre
npm run check            # verificación de tipos (TypeScript estricto)
```

## Problemas frecuentes

- **`http://localhost:3001 is already used`** (o `5173`): detén `npm run dev` y el
  backend de desarrollo, y vuelve a ejecutar.
- **No se puede descargar MongoDB** (sin internet o red restringida): define
  `MONGOMS_SYSTEM_BINARY` con la ruta a un binario `mongod` ya descargado, p. ej.
  el de la caché de los tests del backend
  (`node_modules/.cache/mongodb-memory-server/mongod-…`).
- **Falta el navegador**: ejecuta `npx playwright install chromium`.
