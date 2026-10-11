---
name: generar-tasks
description: Use cuando se deba crear o reescribir un archivo tasks.md (tareas de implementación) del proyecto tiendaDCC. Genera las tareas de una funcionalidad en specs/<id>/tasks.md a partir de su plan.md y spec.md, siguiendo la constitución y las convenciones del repositorio. NO usar para spec.md ni plan.md.
---

# Generar `tasks.md`

Skill para redactar el archivo `specs/<id>/tasks.md` del proyecto tiendaDCC. Un `tasks.md` descompone el plan en **tareas pequeñas** (≈20–30 min c/u) en **orden de dependencia**, cada una con los RF que cubre y un criterio de terminación verificable "Hecho cuando:". Es el último documento de planificación: viene después de la spec (`spec.md`) y del plan (`plan.md`).

## Reglas previas (antes de escribir)

1. Lee `docs/constitution.md`, `AGENTS.md`, la `spec.md` (RF, RNF, criterios de finalización) y el `plan.md` completos de la funcionalidad.
2. Lee un `tasks.md` existente (p. ej. `specs/001-tiendaDCC/tasks.md`) y replica su estructura, tono y densidad.
3. Respeta la fase/orden de dependencia: no numeres ni ordenes de más a menos complejo, sino lo que la dependencia técnica manda (lógica pura y datos antes que UI; páginas antes que integración).
4. NO modifiques `specs/` existentes salvo petición explícita. NO toques `spec.md` ni `plan.md`: esta skill solo genera `tasks.md`.

## Estructura obligatoria del `tasks.md`

Título: `# Tasks NNN — <título descriptivo>` (mismo NNN y tema que spec y plan).

Intro de una línea: "Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio \"Hecho cuando:\". Marco de cierre global: `npm run check` en verde."

### Fases con encabezado y dependencias

Cada fase se declara con `## Fase <N> — <Nombre>` y, cuando dependa de tareas previas, `(depende de <números de tarea>)`:

```
## Fase 0 — Base

## Fase 1 — Lógica pura y datos (depende de 1)

## Fase 2 — Infraestructura de UI (depende de 3)

## Fase 3 — Integración y cierre (depende de N, M)
```

Fases típicas (solo si aplican): **Fase 0 — Base/Inventario**, **Lógica pura y datos**, **Infraestructura de UI**, por **página/vista**, **Backend** (rutas/controladores), e **Integración y cierre**.

### Cada tarea

```
- [ ] **<N>. <Nombre corto de la tarea>**
    RF: <RF-N> (<anotación si aporta contexto>)
    Hecho cuando: <criterio de terminación observable y verificable>.
```

Reglas:
- Numeración correlativa global (1, 2, 3, …) sin reiniciar por fase.
- `RF:` lista los RF y, si corresponde, RNF que cubre (p. ej. `RF: RNF-3, RNF-4` o `RF: RF-1…RF-8`). Cada RF del plan debe quedar cubierto por al menos una tarea.
- **"Hecho cuando:"** siempre en primera persona, observable y verificable, heredado del criterio de aceptación/duda de la spec y del módulo del plan. Debe incluir el comando de verificación cuando aplique (p. ej. "y sus tests unitarios pasan", "pasa `npm run check`").
- Algunas tareas incluyen el estado finalizado `- [x]` (por ejemplo, tareas de inventario ya hechas al generar `tasks.md`). Las tareas de implementación pendientes van con `- [ ]`.

### Cierre

La **última fase siempre** termina con la tarea de cierre global, y la **última tarea** es:

```
- [x] **<N>. Cierre: `npm run check` en verde**
    RF: RNF-<Tests>, criterio de finalización <N>
    Hecho cuando: `npm run check` (tipos + tests + build) pasa sin errores y anoto el resultado en la respuesta final.
```

## Reglas de estilo y lenguaje

- **Idioma:** español. Nombres de archivos/módulos/funciones en inglés (§6).
- Terminología consistente: **RF**, **RNF**, fases numeradas, `Hecho cuando:` literal (con los dos puntos y la primera persona como en el ejemplo).
- Cada tarea debe ser ejecutable independientemente con su propio criterio de "terminado"; si una tarea no tiene criterio observable, no está bien descompuesta.
- No crees tareas fuera del alcance de la spec (fuera de alcance) ni del todo del plan.
- "Hecho cuando:" es el criterio de término de la tarea —contrasta con el plan, que habla de *cubrir* RF—. No mezclarlos.

## Proceso de generación

1. Confirma que existen `spec.md` y `plan.md` de la funcionalidad. Si falta alguno, generarlo primero (skills `generar-spec` y `generar-plan`).
2. Pregunta al usuario el id de la spec (`specs/<id>/tasks.md`) si no se desprende.
3. Descompón el plan en tareas pequeñas ordenadas por dependencia cubriendo todos los RF.
4. Redacta el `tasks.md` completo en `specs/<id>/tasks.md`.
5. Cierra recordando que la planificación quedó completa (spec → plan → tareas) y que el siguiente paso es implementar tarea a tarea corriendo `npm run check` al final de cada una conforme AGENTS.md.