# tiendaDCC

Página web de venta de productos del Departamento de Ciencias de la Computación (DCC) de la Universidad de Chile (tazas, poleras, stickers, etc.).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind v4 |
| Backend | Express (pendiente de especificar) |
| Base de datos | MongoDB (Mongoose) (pendiente de especificar) |
| Validación | Zod |
| Tests | Vitest + Testing Library |

La constitución del proyecto vive en `docs/constitution.md`; define las reglas de stack, orden de trabajo, separación de lógica/UI, política de tests, persistencia e idioma.

## Estructura del repositorio

```
apps/frontend/client/   Aplicación React (componentes, páginas, hooks, lógica)
apps/backend/           Backend Express (integrado como parte del stack)
docs/                   Constitución del proyecto
specs/<id>/             Spec, plan y tareas por funcionalidad
```

## Flujo de trabajo del proyecto

Todo cambio de comportamiento sigue este orden (constitución):

1. **Spec** (`specs/<id>/spec.md`): el QUÉ y el POR QUÉ — requisitos funcionales (RF-x) con criterios de aceptación en EARS, requisitos no funcionales, casos límite, fuera de alcance y dudas abiertas.
2. **Plan** (`specs/<id>/plan.md`): estructura de módulos, modelo de datos, decisiones técnicas con alternativas descartadas, estrategia de tests y cobertura de RF.
3. **Tareas** (`specs/<id>/tasks.md`): tareas pequeñas en orden de dependencia, cada una con sus RF y criterio "Hecho cuando:".
4. **Código**: tests primero, luego implementación.
5. **Cierre**: `npm run check` en verde antes de dar por terminada una tarea.

Reglas clave: no se escribe código sin spec previa, no se agregan dependencias fuera del stack sin actualizar la spec, la lógica de negocio vive separada de la interfaz y toda lógica de negocio debe tener tests.

## Requisitos

- Node.js ≥ 20 y npm ≥ 10.

## Instalación

Las dependencias viven dentro de `apps/frontend/client` (un solo `node_modules` y un solo `package-lock.json`). Instala desde la raíz:

```bash
npm install --prefix apps/frontend/client
```

## Variables de entorno

El backend valida sus variables con Zod al arrancar (`apps/backend/src/config/env.ts`); si falta `MONGODB_URI` o `JWT_SECRET`, aborta con un mensaje en español y no escucha peticiones. Copia las plantillas y completa los valores:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/client/.env.example apps/frontend/client/.env.local
```

Los archivos `.env` y `.env.local` están gitignoreados; las plantillas `.env.example` sí se versionan.

### Backend — `apps/backend/.env`

Lo carga `npm run dev -w backend` con `--env-file-if-exists=.env` (cwd = `apps/backend`). Un `.env` en la raíz **no** se lee.

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `MONGODB_URI` | Sí | — | Cadena de conexión de MongoDB (p. ej. `mongodb://localhost:27017/tiendadcc`). |
| `JWT_SECRET` | Sí | — | Secreto para firmar los JWT (expiran en 7 días). Genera con `openssl rand -hex 32`. |
| `PORT` | No | `3001` | Puerto del backend. Si lo cambias, actualiza el target del proxy en `apps/frontend/client/vite.config.ts`. |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test`. En `production` la cookie se marca `Secure` (requiere HTTPS). |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Origen exacto del frontend para CORS con credenciales. |

### Frontend — `apps/frontend/client/.env.local`

Vite solo expone las variables con prefijo `VITE_`.

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `VITE_API_URL` | No | vacío (`""`) | URL base del backend. Vacío = mismo origen (Vite proxya `/api` a `http://localhost:3001`); recomendado en desarrollo. Al apuntar a otro origen, la cookie `SameSite=Lax` no se envía y la sesión no se mantiene. |

Los tests no necesitan `.env`: `apps/backend/vitest.config.ts` inyecta sus propias variables.

## Comandos (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta Vite en `http://localhost:5173` con hot reload |
| `npm run check` | Verifica tipos (`tsc --noEmit`) y ejecuta los tests (Vitest) |
| `npm run build` | Compila la app a `apps/frontend/client/dist` |

## Cómo correr el proyecto

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Funcionalidad actual (spec 001)

Landing **solo frontend** con tres vistas por enrutamiento de hash (funcionan por URL directa y con recarga):

| URL | Vista |
|---|---|
| `http://localhost:5173/#/` | Inicio: marca "TiendaDCC", descripción, accesos a registro/login y vista previa de productos de ejemplo |
| `http://localhost:5173/#/registro` | Formulario de registro (nombre, correo, contraseña y confirmación) |
| `http://localhost:5173/#/iniciar-sesion` | Formulario de inicio de sesión (correo y contraseña) |

Los formularios aún **no funcionan**: su envío no valida ni envía datos (frontend-only, sin backend). La paleta visual usa azul institucional U. de Chile con acento rojo.

Detalles verificables: `specs/001-tiendaDCC/spec.md`, `plan.md` y `tasks.md`.

## Tests

```bash
npm run check   # tipos + tests
```

La estrategia de tests por spec está en `specs/<id>/plan.md`. La lógica pura (p. ej. `routeParser`, `productParse`) exige cobertura; la presentación pura no.