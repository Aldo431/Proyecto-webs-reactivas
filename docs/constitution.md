# Constitución — tiendaDCC

1. **Simplicidad del stack.** Sólo se usan las tecnologías del stack del
   proyecto: React 19, Vite, Hono, MongoDB/Mongoose, Tailwind v4 y Zod. Toda
   dependencia nueva se agrega previa actualización de la spec.

2. **Spec antes que código.** Ningún código se escribe sin que la funcionalidad
   esté definida en `specs/`. Todo cambio de comportamiento se refleja primero
   en la spec y queda verificable contra ella.

3. **Lógica separada de interfaz.** Los componentes de React sólo manejan
   presentación y estado de UI. La lógica de negocio y el intercambio con la API
   viven en funciones y hooks puros, reutilizables y testables.

4. **Política de tests.** Toda lógica de negocio debe tener tests. La
   presentación pura no exige cobertura. `npm run check` debe pasar antes de
   dar por terminada cualquier tarea.

5. **Persistencia de datos.** Toda lectura y escritura de datos pasa por los
   modelos Mongoose en el backend. El frontend nunca persiste ni consulta la
   base de datos directamente.

6. **Idioma.** Código, identificadores y variables en inglés. Los mensajes y
   textos orientados al usuario final, en español.