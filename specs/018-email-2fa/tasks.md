# Tasks 018 — Verificación en dos pasos por correo

Tareas pequeñas (≈20–30 min c/u) en orden de dependencia. Cada una indica los RF que cubre y su criterio "Hecho cuando:". Marco de cierre global: `npm run check` en verde.

## Fase 0 — Base

- [x] **1. Inventario 018 del login, el perfil y el router**
    RF: RF-1…RF-5 (base para todo)
    Hecho cuando: conozco `loginInputSchema`/`publicUserSchema` y `passwordResetService` de `@tiendadcc/utils`/backend, `authController`, `authService`, `session.ts`, `emailService`, `rateLimit.ts`, `requireAuth`, `errorHandler`, `User`, `authApi`, `authStore`, `LoginPage`, `ProfilePage`, `App.tsx`, `OnlyAnonymousRoute`, `returnPath.ts`, `TextField`/`Button`/`Card` del design system, los patrones de tests de la spec 010 y dónde aterriza cada módulo del plan.

## Fase 1 — utils: esquemas y lógica pura (depende de 1)

- [ ] **2. Esquemas Zod de 2FA**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: `utils/src/mfaSchemas.ts` exporta las constantes de TTL/intentos, `mfaPurposeSchema`, `mfaCodeSchema` (6 dígitos), `mfaChallengeIdSchema`, `mfaVerifyInputSchema`, `mfaEnableConfirmSchema`, `mfaDisableInputSchema`, `mfaResendInputSchema`, `mfaRequiredSchema`, `loginResponseSchema` y `mfaActionResponseSchema`, amplía `publicUserSchema` con `mfaEnabled: z.boolean().default(false)`, todo reexportado desde `index.ts`, y sus tests (códigos válidos/inválidos, unión de respuestas y usuarios antiguos sin `mfaEnabled`) pasan.

- [ ] **3. Generación y comparación segura del código**
    RF: RF-1, RF-3 (RNF-3)
    Hecho cuando: `utils/src/mfaCode.ts` implementa `generateMfaCode`, `hashMfaCode` y `safeEqualMfaCode` con `crypto`, sin dependencias nuevas, y sus tests (rango de 6 dígitos, hash estable, iguales/distintos/longitudes diferentes) pasan con `npm run check -w @tiendadcc/utils`.

## Fase 2 — backend (depende de 2, 3)

- [ ] **4. Modelo `MfaChallenge` y campo `mfaEnabled`**
    RF: RF-1, RF-2, RF-3
    Hecho cuando: `models/MfaChallenge.ts` define `user`, `purpose`, `codeHash`, `expiresAt`, `attempts`, `usedAt`, `timestamps`, índice TTL por expiración y serialización sin hash; `models/User.ts` agrega `mfaEnabled` (default `false`) y lo expone en `toPublicJSON`, y `npm run check -w backend` compila.

- [ ] **5. Servicio de desafíos**
    RF: RF-1, RF-2, RF-3, RF-4
    Hecho cuando: `mfaService.createChallenge` persiste el hash con el TTL según propósito; `verifyChallenge(challengeId, userId, code, purpose)` rechaza ajeno/inexistente/usado/expirado (`400`/`429`), consume intentos, invalida en acierto y no reutiliza; `resendChallenge` respeta 3 reenvíos; todo con dependencias inyectables y tests unitarios del ciclo completo.

- [ ] **6. Correo y límite de solicitudes**
    RF: RF-1, RF-3
    Hecho cuando: `emailService.sendMfaCodeEmail` usa el bypass de consola en desarrollo/test y SMTP en producción con texto en español, `middleware/rateLimit.ts` exporta `mfaRateLimit` y `resetMfaRateLimits` con mensaje en español, y sus tests pasan.

- [ ] **7. Rutas de gestión de 2FA**
    RF: RF-1, RF-3, RF-4
    Hecho cuando: `mfaRoutes` monta `POST /api/auth/mfa/enable`, `/confirm`, `/disable/request`, `/disable` y `/resend` con `requireAuth` donde corresponde, `mfaController` valida con Zod y responde `202`/`200`/`400`/`401`/`409`/`429`, y `app.ts` monta el router bajo `/api/auth`.

- [ ] **8. Login en dos pasos**
    RF: RF-2
    Hecho cuando: `authController.login` crea un desafío y devuelve `{ mfaRequired, challengeId, message, devCode? }` sin `Set-Cookie` para usuarios con 2FA, mantiene el flujo y el mensaje de `401` para usuarios sin 2FA o contraseña incorrecta, y los tests de `authRoutes` cubren ambos casos.

- [ ] **9. Verificación de login y limpieza E2E**
    RF: RF-2, RF-3 (RNF-5)
    Hecho cuando: `POST /api/auth/mfa/verify` valida el desafío, establece la cookie y devuelve el usuario con `mfaEnabled: true`; `testingController` elimina `mfaChallenges` en el reset y responde `204`; y los tests de integración (sin cookie antes, con cookie después, `challengeId` ajeno, reset) pasan.

- [ ] **10. Tests completos de rutas 2FA**
    RF: RF-1, RF-2, RF-3, RF-4
    Hecho cuando: con supertest + `mongodb-memory-server` verifico activación, confirmación, doble activación `409`, desactivación con contraseña y código, contraseña errónea `401`, código inválido/expirado/usado `400`, 5 fallos → `429`, 3 reenvíos → `429`, `devCode` solo en test y ausencia de `devCode` en producción, y `npm run check -w backend` pasa.

## Fase 3 — cliente API y estado (depende de 2, 7, 8, 9)

- [ ] **11. Cliente API `mfaApi`**
    RF: RF-1, RF-2, RF-3, RF-4
    Hecho cuando: `mfaApi.ts` expone `requestMfaEnable`, `confirmMfaEnable`, `requestMfaDisable`, `disableMfa`, `verifyMfaLogin` y `resendMfaCode` con `credentials: "include"`, validación Zod y resultados discriminados con mensajes en español, y sus tests con `fetch` simulado pasan.

- [ ] **12. `authApi.login` y formato de textos**
    RF: RF-2, RF-3, RF-5
    Hecho cuando: `login` devuelve `LoginResult` distinguiendo éxito con usuario, `mfaRequired` y fallo, conserva `devCode`, y `mfaFormat.ts` centraliza `mfaStatusLabel` y `mfaErrorFromStatus` con textos en español y tests que pasan.

- [ ] **13. Estado de sesión para el segundo paso**
    RF: RF-2, RF-5
    Hecho cuando: `authStore.login` no autentica cuando llega `mfaRequired`, la nueva acción `verifyMfa` autentica con el usuario verificado, `logout`/`refresh` siguen iguales, `resetAuthStore` limpia el estado y sus tests (incluido el flujo two-step) pasan.

## Fase 4 — UI y router (depende de 11, 12, 13)

- [ ] **14. Vista `#/verificar-clave`**
    RF: RF-2, RF-3, RF-5
    Hecho cuando: `MfaVerifyPage` lee `challengeId` de `location.state`, redirige a `#/iniciar-sesion` sin él, valida 6 dígitos, muestra errores con `role="alert"`, permite reenviar, muestra `devCode` solo si la respuesta lo trae, llama a `verifyMfa` y navega a la ruta original o al inicio, con smoke tests que pasan.

- [ ] **15. Configuración en el perfil**
    RF: RF-1, RF-4, RF-5
    Hecho cuando: `MfaSettings` muestra "Activada"/"Desactivada", permite activar con código, desactivar con código y contraseña, respeta `disabled`/`aria-busy` y mensajes accesibles, `ProfilePage` lo integra leyendo `mfaEnabled` del store, y sus smoke tests pasan.

- [ ] **16. Integración con login, guardias y back/forward**
    RF: RF-2, RF-5
    Hecho cuando: `LoginPage` navega a `/verificar-clave` con `{ challengeId, from, devCode? }` sin guardar la contraseña, `App.tsx` registra la ruta bajo `OnlyAnonymousRoute`, las URLs `#/iniciar-sesion` y `#/verificar-clave` responden a back/forward sin recarga, y `App.test.tsx`/`LoginPage.test.tsx` siguen pasando.

- [ ] **17. Tests de UI y compatibilidad**
    RF: RF-1…RF-5 (RNF-7)
    Hecho cuando: pasan los tests de `mfaApi`, `authApi`, `authStore`, `mfaFormat`, `MfaVerifyPage`, `MfaSettings` y `App`, los tests existentes de login/guardias/carrito siguen verdes, y `npm run check -w tiendadcc-client` compila sin `any`.

## Fase 5 — E2E, QA y cierre (depende de 10, 17)

- [ ] **18. Suite E2E de 2FA**
    RF: RF-1, RF-2, RF-3, RF-4, RF-5
    Hecho cuando: `e2etests/helpers.ts` incluye `enableMfa` y `loginWithMfa` usando `devCode`, el nuevo `mfa.spec.ts` cubre activación desde el perfil, login en dos pasos, reenvío, código erróneo, desactivación y que un usuario sin 2FA sigue entrando en un paso, con selectores accesibles y `npm run e2e` verde.

- [ ] **19. Verificación QA según criterios de finalización**
    RF: RF-1…RF-5, RNF-1…RNF-7
    Hecho cuando: verifico contra MongoDB local que el código llega por consola, el login con 2FA no entrega cookie antes del código, 5 fallos y 3 reenvíos bloquean, la desactivación exige contraseña, `#/verificar-clave` redirige sin desafío, el login sin 2FA no cambió, no se agregaron dependencias ni se tocó el design system, y 360 px y teclado funcionan sin errores en consola.

- [ ] **20. Cierre: `npm run check` en verde**
    RF: RNF-5, criterio de finalización 7
    Hecho cuando: `npm run check` de raíz (tipos + tests de los tres workspaces) pasa sin errores y anoto el resultado en la respuesta final.
