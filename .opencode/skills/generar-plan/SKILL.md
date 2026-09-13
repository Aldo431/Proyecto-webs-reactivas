---
name: generar-plan
description: Use cuando se deba crear o reescribir un archivo plan.md (plan de implementación) del proyecto tiendaDCC. Genera el plan de una funcionalidad en specs/<id>/plan.md a partir de su spec.md, siguiendo la constitución y las convenciones del repositorio. NO usar para spec.md ni tasks.md.
---

# Generar `plan.md`

Skill para redactar el archivo `specs/<id>/plan.md` del proyecto tiendaDCC. Un plan define **el CÓMO**: estructura de módulos, modelo de datos, decisiones técnicas justificadas (con alternativas descartadas), estrategia de tests y cobertura de RF. Parte siempre de una spec ya redactada (`spec.md`) y deja que las **tareas** (`tasks.md`) se generen después.

## Reglas previas (antes de escribir)

1. Lee `docs/constitution.md`, `AGENTS.md` y la `spec.md` completa de la funcionalidad (`specs/<id>/spec.md`). El plan debe cubrir **todos** los RF y RNF de la spec.
2. Lee un plan existente (p. ej. `specs/001-tiendaDCC/plan.md`) y replica su estructura, tono y nomenclatura.
3. Inspecciona ligeramente el código existente (`apps/frontend/client/`, `apps/backend/`, `utils/`, `models/`) para que los módulos propuestos aterricen en carpetas reales y respeten §3 (lógica separada de interfaz).
4. Cada sección del plan declara `*Cubre: RF-x…*`. Toda decisión técnica que toque un RF lo referencia con `*(RF-N)*`.
5. NO modifiques `specs/` existentes salvo petición explícita. NO toques `spec.md` salvo para resolver dudas que el plan asume (y esa resolución pertenece a la spec, no al plan).

## Estructura obligatoria del `plan.md`

Título: `# Plan NNN — <título descriptivo>` (mismo NNN y tema que la spec).

Intro de una línea: "Plan de implementación para la spec `<id>`. Respeta la constitución (§1–§6), AGENTS.md y cubre RF-1 a RF-N. Cada sección indica qué RF atiende."

### 1. Estructura de módulos
*Cubre: <RF que atiende cada bloque>.*

Organización en módulos dentro de la carpeta correspondiente (`apps/frontend/client/`, `apps/backend/server/`, `utils/`, `models/`). Separar explícitamente:

- **Presentación** (`pages/`, `components/`): componentes React solo presentación y estado de UI (§3), con props tipadas. Indicar dentro de cada elemento qué RF cubre con `*(RF-N)*`.
- **Lógica pura testeable** (`logic/`, `utils/`): funciones puras y hooks reutilizables (parseadores, validación Zod, ruteo). Tests obligatorios (§4).
- **Datos** (`data/`): JSON/estáticos, con esquema Zod para validar al cargar (AGENTS.md).
- **Backend** (si aplica): rutas, controladores y conexión DB, con validación Zod de entrada (AGENTS.md).

### 2. Modelo de datos JSON
*Cubre: <RF>.*

Muestra el/los dato/s con un bloque ```json. Reglas:
- Claves en inglés; valores orientados al usuario en español (§6).
- Se valida con un esquema Zod (AGENTS.md).
- Si el contexto es solo frontend, indicar que no hay persistencia ni red (RNF-2, §5).
- Añadir una nota entre paréntesis explicando decisiones como rutas de imagen locales (evitar red externa), etc.

### 3. Decisiones técnicas justificadas
*Cubre: transversal (todos los RF; se indica en cada decisión).*

Cada decisión con el formato:

```
**D1 — <Nombre de la decisión>.**
- Justificación: <argumento enlazado a RF/RNF/constitución/AGENTS.md; cita el requisito que fuerza la decisión>.
- Alternativa descartada: **<nombre>**. <por qué no elegida, idealmente enlazada a §1/§5/RNF/S fuera de alcance>.
```

Reglas:
- Numera D1, D2, … en orden.
- Numerar es obligatorio: sin una alternativa considerada y descartada, la sección está incompleta.
- Enlaza cada justificación a un RF/RNF o a la constitución (`(RF-6)`, `RNF-2`, `§3`, `AGENTS.md`).
- Si una duda abierta de la spec afecta la decisión, declárala ("el plan asume X hasta aclaración").

### 4. Estrategia de tests
*Cubre: todos los RF vía verificación; conforme §4 y criterio de finalización N.*

- **Lógica pura obligatoria (§4):** lista de funciones puras con casos de prueba concretos (entradas → salidas esperadas) y `*(Verifica RF-x…)*`.
- **Presentación (no requiere cobertura, §4):** smoke tests opcionales de render; indica qué renderizar y qué verificar.
- **Backend (si aplica):** tests de rutas/controladores y validación Zod (entradas inválidas rechazadas).
- **Verificación de contrato por QA (manual):** flujos de clic/navegación/URL directa/recarga que solo se prueban a mano.
- **Ausencia de red / mocking:** declarar si no hay llamadas de API que simular.
- **Comando de cierre:** `npm run check` (tipos + tests + build) debe pasar antes de dar por terminada la tarea.

### 5. Cobertura de RFs (referencia cruzada)

Tabla de dos columnas `| Parte del plan | RF |` donde cada módulo/estrategia del plan mapea a los RF que cubre. Los tests de lógica pura aparecen como fila final con `verificación RF-1…RF-N (§4)`.

Cierra con `---` y una Nota final sobre cómo se resuelven las dudas abiertas de la spec (en implementación o próxima actualización de la spec) y que el plan asume los valores más conservadores.

## Reglas de estilo y lenguaje

- **Idioma del plan:** español. Identificadores de código, funciones y variables en inglés (§6).
- Terminología consistente: **RF**, **RNF**, **D** (decisión) y referencias a la constitución con `§N`.
- "Hecho cuando:" es del `tasks.md`; el plan habla de *cubrir/verificar* RF.
- No inventes dependencias que no están en el stack (§1); si el plan necesita una, es señal de que la spec debe actualizarse antes.
- La sección 2 solo aplica si la funcionalidad maneja datos; si no maneja datos, omítela.

## Proceso de generación

1. Confirma que existe la `spec.md` de la funcionalidad; si no, genera esa primero (usar la skill `generar-spec`).
2. Pregunta al usuario el id de la spec (`specs/<id>/plan.md`) si no se desprende.
3. Redacta el `plan.md` completo en `specs/<id>/plan.md`, cubriendo todos los RF.
4. Cierra señalando que el siguiente paso es generar `tasks.md` (fuera de esta skill). No se espera correr `npm run check` porque no se tocó código.