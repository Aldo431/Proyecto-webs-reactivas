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

## Al terminar cualquier tarea
- Ejecuta `npm run check` y confirma en tu respuesta que todo pasa.