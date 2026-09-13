# Plan 001 — Página de inicio y accesos de autenticación (frontend)

Plan de implementación para la spec `001-tiendaDCC`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-8. Cada sección indica qué RF atiende.

## 1. Estructura de módulos
*Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8.*

Organización dentro del frontend existente (`apps/frontend/client/`), separando lógica de interfaz (§3):

- **Enrutamiento (hook propio)** — `hooks/`
  - `useHashRouter`: lee el hash de la URL, lo decodifica en una ruta (`home` | `register` | `login` | `unknown`) y expone la vista activa. Con hash routing, RF-8 (URL directa y F5) funciona sin backend.
  - `navigate(target)`: cambia la URL y actualiza el estado sin recargar el sitio (RNF-5, RF-2/RF-3).
- **Páginas (presentación pura)** — `pages/`
  - `HomePage`: logo + nombre "TiendaDCC", descripción de la tienda, accesos "Registrarse ahora" e "Iniciar sesión", y sección de vista previa de productos. *(RF-1, RF-6)*
  - `RegisterPage`: formulario con nombre, correo, contraseña y confirmación. *(RF-4)*
  - `LoginPage`: formulario con correo y contraseña. *(RF-5)*
- **Componentes compartidos** — `components/`
  - `Header`: logo clicable + (en páginas de formulario) botón "Volver", ambos navegan al inicio. *(RF-7)*
  - `AuthBar` / botones de acceso: "Registrarse ahora" y "Iniciar sesión". *(RF-1, RF-2, RF-3)*
  - `ProductCard` y `ProductGrid`: render de la grilla de productos de ejemplo, sin navegación al hacer clic. *(RF-6)*
  - `TextField`: campo de formulario reutilizable (solo estado local de UI). *(RF-4, RF-5)*
- **Datos de ejemplo** — `data/`
  - `products.json`: catálogo estático de muestra. *(RF-6)*
  - Esquema Zod para validar el archivo al cargarlo (AGENTS.md). *(RF-6)*
- **Lógica pura (tests obligatorios, §4)** — `logic/`
  - `routeParser`: función pura que decodifica el hash en ruta (`home`, `register`, `login` o `unknown`).
  - `productParse`: función pura que valida el modelo de producto con Zod.

## 2. Modelo de datos JSON
*Cubre: RF-6.*

Producto de ejemplo, estático, empaquetado en el bundle. No hay persistencia ni llamadas de red (RNF-2, constitución §5: el frontend nunca persiste; aquí ni siquiera hay backend). Claves en inglés; valores orientados al usuario en español (§6). Se valida con Zod (AGENTS.md) para fallar rápido en build/test si el dato se malogra.

```json
{
  "products": [
    {
      "id": "taza-dcc",
      "name": "Taza DCC",
      "category": "Tazas",
      "image": "/images/taza-dcc.png",
      "description": "Taza de cerámica con el logo del DCC."
    },
    {
      "id": "polera-dcc",
      "name": "Polera DCC",
      "category": "Poleras",
      "image": "/images/polera-dcc.png",
      "description": "Polera de algodón con estampado del DCC."
    },
    {
      "id": "sticker-dcc",
      "name": "Sticker DCC",
      "category": "Stickers",
      "image": "/images/sticker-dcc.png",
      "description": "Stickers con el logo del DCC."
    }
  ]
}
```

(El `image` es una ruta local; así se evitan llamadas de red externas y se preserva el comportamiento sin conexión del caso límite.)

## 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

**D1 — Enrutamiento por hash hecho a medida, sin librería de rutas.**
- Justificación: RF-8 exige que la URL directa y la recarga (F5) funcionen en las tres vistas sin dependencias nuevas (§1: solo stack). El hash (`#/registro`, `#/iniciar-sesion`) se sirve desde un único `index.html`, por lo que no requiere fallback de servidor ni backend (RNF-2). Además cumple RNF-5 (sin recarga completa) y encaja con §3 (hook puro y testeable).
- Alternativa descartada: **React Router**. Es el estándar de la industria, pero es una dependencia fuera del stack (§1) y obligaría a actualizar la spec; además, con rutas limpias (`/registro`) la recarga exige fallback del servidor, lo que contradice RNF-2 (sin backend).

**D2 — Vista previa con datos estáticos empaquetados en el bundle.**
- Justificación: la spec define la tienda como solo frontend (contexto), sin backend (RNF-2) y con productos "de ejemplo". Empaquetar el JSON en el bundle elimina llamadas de red y garantiza el comportamiento idéntico sin conexión (caso límite). *(RF-6)*
- Alternativa descartada: **obtener los productos desde una API** (Hono + MongoDB/Mongoose). Es la vía correcta cuando exista catálogo real, pero implica persistencia y consulta de datos (§5), backend y red — todo explícitamente fuera de alcance en la spec.

**D3 — Validación del modelo de producto con Zod en el frontend.**
- Justificación: AGENTS.md exige que toda entrada de datos externa se valide con esquemas Zod. Aunque los datos de ejemplo son locales, validarlos al importar detecta errores de estructura (campos faltantes, tipos incorrectos) en tiempo de build/test. Zod ya está en el stack (§1). *(RF-6)*
- Alternativa descartada: **validación manual ad hoc** (ifs/typeof). Reintroduce lógica de verificación no reutilizable y sin contrato declarativo; el proyecto ya dispone de Zod.

**D4 — Formularios con estado local de UI y envío sin efecto.**
- Justificación: RF-4 y RF-5 mandan que el envío "no valide ni envíe datos". Los componentes gestionan solo presentación y estado de UI (§3); no existe lógica de negocio de envío en esta fase. El botón de envío se deja sin efecto (la duda abierta 1 de la spec decide si deshabilitado o activo-sin-efecto; el plan asume activo-sin-efecto hasta aclaración).
- Alternativa descartada: **handlers de submit con validación o llamada a API**. Contradice RF-4/RF-5 (sin acción) e introduce lógica de negocio que la spec no define.

**D5 — Header compartido con logo clicable y botón "Volver".**
- Justificación: RF-7 exige ambos mecanismos desde las páginas de formulario; un único `Header` evita duplicar lógica de navegación y deja un único punto de entrada a `navigate(home)`. *(RF-7)*
- Alternativa descartada: **botones "Volver" duplicados e independientes en cada página** — duplicación de comportamiento y mayor riesgo de divergencia frente a la navegación impuesta por RF-7.

## 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización 7.*

- **Lógica pura obligatoria (§4):**
  - `routeParser`: casos para `#/`, `#/registro`, `#/iniciar-sesion`, hash vacío, hash desconocido y hash mal formado → ruta resultante correcta e `unknown` en lo inválido. *(Verifica RF-1, RF-2, RF-3, RF-8)*
  - `productParse`: valida el `products.json` de ejemplo y rechaza entradas malformadas (sin `id`, `name` de tipo erróneo, `image` inexistente). *(RF-6)*
- **Presentación (no requiere cobertura, §4):**
  - Smoke tests opcionales de render: Home muestra logo, descripción y los dos accesos *(RF-1)*; Register muestra los 4 campos *(RF-4)*; Login muestra los 2 campos *(RF-5)*; grilla renderiza con 1 y con N productos sin romperse *(RF-6)*.
- **Verificación de contrato por QA (manual):**
  - Navegación por clic a ambas vistas sin recarga *(RF-2, RF-3)*, regreso por "Volver" y por logo *(RF-7)*, URL directa y recarga en las tres vistas *(RF-8)*.
- **Ausencia de red:** no hay llamadas de API que simular (RNF-2); no se requiere mocking.
- **Comando de cierre:** `npm run check` (tipos + tests) debe pasar antes de dar por terminada la tarea.

## 5. Cobertura de RFs (referencia cruzada)

| Parte del plan | RF |
|---|---|
| Router (hash) + `navigate` | RF-1, RF-2, RF-3, RF-7, RF-8 |
| `HomePage` + `AuthBar` | RF-1 |
| `RegisterPage` + `TextField` | RF-4 |
| `LoginPage` + `TextField` | RF-5 |
| `products.json` + Zod + `ProductGrid/Card` | RF-6 |
| `Header` (logo + Volver) | RF-7 |
| `routeParser` (URL directa/recarga) | RF-8 |
| Tests de lógica pura | verificación RF-1…RF-8 (§4) |

---

Nota: las dudas abiertas de la spec (botón de envío, clic en producto, coincidencia de confirmación, branding) se resuelven en la implementación o en la próxima actualización de la spec, y el plan ya asume los valores más conservadores.