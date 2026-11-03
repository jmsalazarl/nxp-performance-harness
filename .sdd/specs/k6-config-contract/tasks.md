# Implementation Plan: K6 Config Contract

## Overview

Plan de implementación del contrato de configuración K6 en TypeScript. El pipeline sigue la arquitectura definida en el diseño: Modelos → Validación → Serialización → Integración con Runner. Se implementan los módulos `validateConfig.ts` y `serializeConfig.ts` como servicios TypeScript, con tests basados en propiedades usando fast-check y Vitest para verificar corrección.

## Tasks

- [x] 1. Configurar estructura del proyecto e interfaces TypeScript
  - [x] 1.1 Crear tipos e interfaces del modelo de configuración
    - Crear `src/models/config.types.ts` con las interfaces: `Config`, `Endpoint`, `HttpMethod`, `ProfileName`, `TestProfile`, `Stage`, `ValidationResult`, `ValidationError`
    - Definir el tipo unión `HttpMethod` con los métodos soportados: GET, POST, PUT, PATCH, DELETE
    - Definir el tipo unión `ProfileName` con: loadtest, stresstest, capacitytest, stabilitytest
    - Exportar todas las interfaces para uso en validación, serialización y tests
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 3.1–3.4, 4.1, 4.2_

  - [x] 1.2 Configurar framework de testing con Vitest y fast-check
    - Verificar/crear `vitest.config.ts` con include de `tests/**/*.test.ts`
    - Crear estructura de directorios: `tests/unit/`, `tests/properties/`, `tests/integration/`
    - Crear `tests/properties/generators.ts` con generadores fast-check: `arbConfig`, `arbEndpoint`, `arbTestProfile`, `arbStage`, `arbThresholds`, `arbInvalidConfig`
    - Instalar dependencias de desarrollo: `vitest`, `fast-check`
    - _Requirements: 5.1–5.8_

- [x] 2. Implementar módulo de validación de endpoints
  - [x] 2.1 Implementar `validateEndpoint` en `src/services/validateConfig.ts`
    - Validar `url` no vacía y URL absoluta (Req 5.1)
    - Validar `method` dentro de GET, POST, PUT, PATCH, DELETE (Req 5.2)
    - Validar `headers` como objeto JSON plano cuando está presente (Req 5.3)
    - Validar `payload` como JSON válido cuando está presente (Req 5.4)
    - Validar `expectedStatus` entre 100 y 599 (Req 5.5)
    - Retornar array de `ValidationError` con path descriptivo (e.g. `endpoints[0].url`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Implementar `validateTestProfile` y `validateStage`
    - Validar que un perfil tiene al menos un stage (Req 5.6)
    - Validar que cada stage tiene `duration` no vacío y `target` ≥ 0 (Req 5.7)
    - Validar que expresiones de threshold no estén vacías (Req 5.8)
    - Retornar errores acumulados con path completo (e.g. `endpoints[0].loadtest.stages[1].target`)
    - _Requirements: 5.6, 5.7, 5.8_

  - [x] 2.3 Implementar función principal `validateConfig`
    - Iterar sobre todos los endpoints y acumular errores de `validateEndpoint` y `validateTestProfile`
    - Retornar `{ valid: boolean, errors: ValidationError[] }`
    - No hacer fail-fast: reportar todos los errores encontrados
    - _Requirements: 5.1–5.8_

  - [x] 2.4 Escribir unit tests para validación en `tests/unit/validateConfig.test.ts`
    - Test con URL vacía → rechazo
    - Test con URL relativa → rechazo
    - Test con método no soportado → rechazo
    - Test con headers no-objeto → rechazo
    - Test con payload no-JSON → rechazo
    - Test con status fuera de rango → rechazo
    - Test con perfil sin stages → rechazo
    - Test con stage con duration vacío → rechazo
    - Test con stage con target negativo → rechazo
    - Test con threshold vacío → rechazo
    - Test con config válida completa → aceptación
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 3. Property tests para validación
  - [x] 3.1 Escribir property test para rechazo de configs inválidas
    - **Property 4: Rechazo de configuraciones inválidas**
    - Crear test en `tests/properties/config-contract.property.test.ts`
    - Usar generador `arbInvalidConfig` para producir configs con al menos una violación del contrato
    - Verificar que `validateConfig` retorna `valid: false` para cada input generado
    - Mínimo 100 iteraciones
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

  - [x] 3.2 Escribir property test para aceptación de configs válidas
    - **Property 5: Aceptación de configuraciones válidas**
    - Crear test en `tests/properties/config-contract.property.test.ts`
    - Usar generador `arbConfig` para producir configs que cumplen todas las reglas del contrato
    - Verificar que `validateConfig` retorna `valid: true` para cada input generado
    - Mínimo 100 iteraciones
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

- [x] 4. Checkpoint — Validación completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar módulo de serialización
  - [x] 5.1 Implementar `serializeConfig` en `src/services/serializeConfig.ts`
    - Generar texto JavaScript con `export default { endpoints: [...] }`
    - Usar indentación de 2 espacios para legibilidad
    - Preservar todos los campos del endpoint incluyendo metadata opcional (`name`, `description`)
    - Serializar perfiles solo cuando están presentes en el endpoint
    - Producir output determinista (mismo input → mismo output)
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 Implementar preservación exacta de metric keys en thresholds
    - Preservar métricas built-in de K6 (`http_req_duration`, `http_req_failed`, etc.)
    - Preservar métricas custom exactamente: `waiting_time`, `Errors`, `Total_Reqs`, `retries`, `transaction_duration`, `transactions_per_second`, `active_vus`
    - No alterar capitalización ni formato de ningún metric key
    - _Requirements: 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.3 Escribir unit tests para serialización en `tests/unit/serializeConfig.test.ts`
    - Test con config basada en el `config.js` existente del proyecto
    - Test que metadata opcional (`name`, `description`) no rompe la estructura
    - Test que el output es determinista
    - Test que perfiles ausentes no aparecen en el output
    - Test que el output es JavaScript sintácticamente válido
    - _Requirements: 1.1, 1.2, 2.1–2.6, 3.6_

- [x] 6. Property tests para serialización
  - [x] 6.1 Escribir property test para round-trip de serialización
    - **Property 1: Round-trip de serialización**
    - Crear test en `tests/properties/config-contract.property.test.ts`
    - Generar configs válidas con `arbConfig`, serializar a texto con `serializeConfig`, evaluar el texto, comparar estructura con el original
    - Verificar equivalencia estructural del objeto original vs parseado
    - Mínimo 100 iteraciones
    - **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4**

  - [x] 6.2 Escribir property test para preservación selectiva de perfiles
    - **Property 2: Preservación selectiva de perfiles**
    - Crear test en `tests/properties/config-contract.property.test.ts`
    - Generar endpoints con subconjuntos aleatorios de perfiles (0 a 4)
    - Serializar y evaluar, verificar que el output contiene exactamente los perfiles configurados y omite los no configurados
    - Mínimo 100 iteraciones
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

  - [x] 6.3 Escribir property test para preservación de metric keys
    - **Property 3: Preservación exacta de metric keys**
    - Crear test en `tests/properties/config-contract.property.test.ts`
    - Generar thresholds con metric keys variados (built-in y custom del proyecto)
    - Serializar y evaluar, verificar que cada key se preserva sin alteración de capitalización o formato
    - Mínimo 100 iteraciones
    - **Validates: Requirements 4.5, 6.1, 6.2, 6.3, 6.4**

- [x] 7. Checkpoint — Serialización y propiedades verificadas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integración con el runner existente
  - [x] 8.1 Verificar compatibilidad del output con `performancetest.js`
    - Generar un `config.js` de ejemplo usando `serializeConfig`
    - Verificar que `import config from "./config.js"` funciona correctamente como ES module
    - Verificar que `config.endpoints.filter(ep => ep[scenarioName])` resuelve perfiles
    - _Requirements: 1.3, 3.5, 3.6_

  - [x] 8.2 Escribir tests de integración en `tests/integration/runner-compat.test.ts`
    - Importar archivo generado y verificar que `config.endpoints` es un array consumible
    - Ejecutar filtrado por cada `TEST_TYPE` soportado (loadtest, stresstest, capacitytest, stabilitytest)
    - Verificar que métricas custom del runner son accesibles en thresholds
    - Verificar que campos opcionales no rompen el consumo por el runner
    - _Requirements: 1.3, 3.5, 6.1, 6.2, 6.3, 6.4_

- [x] 9. Checkpoint final — Integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requirements específicos para trazabilidad
- Los checkpoints aseguran validación incremental del progreso
- Los property tests verifican propiedades universales de corrección definidas en el diseño
- Los unit tests verifican ejemplos específicos y edge cases
- El lenguaje de implementación es **TypeScript**, consistente con el stack definido en el steering técnico
- Test runner: **Vitest** — ecosistema natural de Vite con soporte nativo TypeScript
- Librería PBT: **fast-check** con mínimo 100 iteraciones por propiedad
- Source code en `src/models/` y `src/services/`
- Tests en `tests/unit/`, `tests/properties/`, `tests/integration/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1", "3.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["8.2"] }
  ]
}
```
