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