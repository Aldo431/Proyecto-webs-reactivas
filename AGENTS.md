# AGENTS.md — tiendaDCC

## Proyecto
Consiste en desarrollar una página web de ventas de productos del Departamente de Computación de la Universidad de Chile (DCC), tales como tazas, poleras, etc.

El stack tecnológico es React 19 + Vite para el frontend, Express para el backend, MongoDB (con Mongoose) para la base de datos, Tailwind v4 para los estilos CSS, y Zod para la validación de tipos y esquemas.

## Arquitectura
- `apps/frontend/client/` : (React, componentes, páginas, hooks).
- `apps/backend/server/` : (Express, rutas, controladores, conexión a DB).
- `utils/` : Tipos y esquemas de Zod compartidos entre frontend y backend.
- `models/` : Modelos de Mongoose para MongoDB.
- `test/` : Tests

## Comandos
- Desarrollo: `npm run dev`
- Tests y verificación de tipos: `npm run check`
- Compilación: `npm run build`

## Variables de entorno
- Backend: `apps/backend/.env` (lo carga `npm run dev -w backend` vía `--env-file-if-exists=.env`; un `.env` en la raíz **no** se lee). Requeridas `MONGODB_URI` y `JWT_SECRET`; opcionales `PORT` (3001), `NODE_ENV` (development) y `CLIENT_ORIGIN` (`http://localhost:5173`). `SEED_SELLER_PASSWORD` solo la usa `npm run seed -w backend` (se valida en `apps/backend/src/seed/seedEnv.ts`, no al arrancar la API). Validadas con Zod en `apps/backend/src/config/env.ts`; si faltan las requeridas el proceso aborta con mensaje en español.
- Frontend: `apps/frontend/client/.env.local`, solo `VITE_API_URL` (por defecto vacío = mismo origen vía proxy de Vite a `http://localhost:3001`). Validada con Zod en `apps/frontend/client/src/logic/env.ts`.
- Si cambias `PORT`, actualiza también el target del proxy en `apps/frontend/client/vite.config.ts`.
- Plantillas versionadas: `apps/backend/.env.example` y `apps/frontend/client/.env.example`. Los `.env`/`.env.local` están gitignoreados: nunca subas secretos reales.
- Los tests no necesitan `.env`: `apps/backend/vitest.config.ts` inyecta sus propias variables.

## Estilo y convenciones
- **React:** React 19, con type hints explícitos en todas las props y componentes.
- **Idioma:** Identificadores, nombres de variables y funciones en inglés; mensajes orientados al usuario final en español.
- **Validación:** Toda entrada de datos externa (formularios, APIs, variables de entorno) debe validarse estrictamente utilizando esquemas de **Zod**.
- **Estilos:** Uso de clases utilitarias de Tailwind v4.

## Reglas
- Lee `docs/constitution.md` y la spec activa en `specs/` antes de tocar código.
- No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec.
- No modifiques archivos dentro de `specs/` salvo petición explícita.
- Valida las variables de entorno al iniciar la aplicación utilizando Zod.
- Antes de tocar UI, lee specs/00-design-system/spec.md

## Al terminar cualquier tarea
- Ejecuta `npm run check` y confirma en tu respuesta que todo pasa.