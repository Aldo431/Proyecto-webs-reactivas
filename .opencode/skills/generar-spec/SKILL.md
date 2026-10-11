---
name: generar-spec
description: Use cuando se deba crear, ampliar o reescribir un archivo spec.md (spec, especificación) del proyecto tiendaDCC. Genera la spec de una funcionalidad en specs/<id>/spec.md siguiendo la constitución y las convenciones del repositorio. NO usar para plan.md, tasks.md ni para escribir la tarea en specs/<id>/plan.md.
---

# Generar `spec.md`

Skill para redactar el archivo `specs/<id>/spec.md` del proyecto tiendaDCC. Una spec define **el QUÉ y el POR QUÉ** de una funcionalidad: requisitos funcionales verificables (RF-x), requisitos no funcionales (RNF-x), casos límite, fuera de alcance y dudas abiertas. El **plan** (`plan.md`) y las **tareas** (`tasks.md`) se generan después, a partir de esta spec.

## Reglas previas (antes de escribir)

1. Lee `docs/constitution.md` y `AGENTS.md`. La spec debe ser coherente con ellos (stack, orden spec→plan→tareas→código, separación lógica/UI, política de tests, idioma).
2. Inspecciona las specs existentes en `specs/` (p. ej. `specs/001-tiendaDCC/spec.md`) y replica su estructura, tono y nomenclatura. Si la nueva funcionalidad es la siguiente, el id es `NNN-<kebab-name>` con `NNN` = último id + 1 en orden numérico.
3. NO modifiques `specs/` existentes salvo petición explícita. NO toques `plan.md` ni `tasks.md`: esta skill solo genera `spec.md`.

## Estructura obligatoria del `spec.md`

Título en la primera línea: `# Spec NNN — <título descriptivo>` seguido de las secciones, en este orden:

### Contexto y objetivo
Qué hace la funcionalidad, para qué, y qué NO incluye aún. Describe el estado actual del sistema si aplica.

### Usuarios
Lista de actores (con `- **Nombre**: descripción`). Incluye al menos el/los usuario/s final/es y al desarrollador (implícito) que consume la spec.

### Historias de usuario
Formato `- Como <usuario>, quiero <necesidad>, para <beneficio>.` Una por requisito principal.

### Requisitos funcionales (RF-x)
Cada RF se escribe con **criterios de aceptación en forma EARS**:

```
**RF-N — <Nombre corto>.**
<Cuándo/Qué circunstancia>, el sistema deberá <respuesta/acción>.
Criterios de aceptación:
- Cuando <precondición>, deberá <resultado>/<no deberá acción>.
```

- Usa "Cuando el usuario..." / "deberá / no deberá" en cada criterio, siempre verificable.
- Todo criterio empieza por `Cuando ` y especifica un **resultado observable**.
- Numera los RF correlativamente; las referencias cruzadas usan `(RF-N)`.

### Requisitos no funcionales (RNF-x)
- **RNF-1 Idioma.** Todo texto orientado al usuario final en español (constitución §6).
- Añade según aplique: responsividad, accesibilidad, desempeño, sin red/backend, tests, dependencias. Respeta que el stack es React 19 + Vite + Express + MongoDB/Mongoose + Tailwind v4 + Zod (§1).

### Casos límite
Escenarios de borde y cómo debe comportarse el sistema en cada uno. Referencia el RF que lo cubre cuando corresponda (p. ej. `(cubierto por RF-8)`).

### Fuera de alcance
Lista explícita de lo que la funcionalidad NO cubre en esa fase (backend, persistencia, autenticación real, catálogo, pagos, despliegue, etc.)

### Criterios de finalización
Lista numerada de condiciones verificables (traza de los RF) que definen cuándo la tarea se considera terminada. La última es siempre: `N. npm run check pasa sin errores.` (constitución §4).

### Dudas abiertas
Lista con `- [NECESITA ACLARACIÓN] <pregunta concreta propositiva>`. Cuando se resuelva, se marca `- [RESUELTO] <decisión>` conservando el hilo. No dejes dudas sin resolver en la spec final salvo que sean decisiones asumibles documentadas.

## Reglas de estilo y lenguaje

- **Idioma de la spec:** español (es un documento técnico del proyecto; los identificadores de código van en inglés, §6).
- Terminología consistente: **RF** = requisito funcional, **RNF** = requisito no funcional.
- Criterios de aceptación siempre binarios y observables; nada de "se ve bonito", "debería andar".
- Si una decisión de diseño depende de una duda abierta, declarar el supuesto adoptado en la duda con `[NECESITA ACLARACIÓN]` y, si se asume provisionalmente, indicarlo explícitamente en el criterio correspondiente.
- No inventar URLs, endpoints ni dependencias; respetar stack y alcance.

## Proceso de generación

1. Pregunta al usuario qué funcionalidad quiere especificar y el id de la spec si no se desprende del orden numérico.
2. Lee la spec existente más reciente para fijar estilo e id siguiente.
3. Redacta el `spec.md` completo en su ruta `specs/<id>/spec.md`.
4. Cierra señalando que una vez aprobada la spec, el siguiente paso es generar `plan.md` (fuera de esta skill) y que `npm run check` no aplica aún porque no se tocó código.