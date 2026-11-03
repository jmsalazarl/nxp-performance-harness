# Implementation Plan: K6 Summary Export

## Overview

Plan de implementación para agregar `handleSummary(data)` al archivo `performancetest.js`. La función exporta el resumen completo de K6 como archivo JSON nombrado según `TEST_TYPE`, manteniendo un output conciso en stdout. Se incluyen property-based tests con fast-check para validar las 4 propiedades de corrección definidas en el diseño, además de unit tests e integration tests para verificar aislamiento del comportamiento existente.

## Tasks

- [x] 1. Implementar handleSummary y exportación JSON
  - [x] 1.1 Agregar función `handleSummary(data)` al final de `performancetest.js`
    - Exportar la función como ES module export
    - Leer `__ENV.TEST_TYPE` con fallback a `"unknown"`
    - Retornar mapa con clave `summary-{testType}.json` conteniendo `JSON.stringify(data, null, 2)`
    - Retornar clave `stdout` con JSON conciso (`test_type` + lista de nombres de métricas)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1-2.5, 4.1-4.4, 5.1-5.3_

  - [x] 1.2 Escribir property test: Round-trip de serialización del resumen
    - **Property 1: Round-trip de serialización del resumen**
    - Generar objetos JSON arbitrarios con estructura `{ metrics: {...}, root_group: {...} }`
    - Verificar que `JSON.parse(output[filename])` sea deep-equal al `data` original
    - Mínimo 100 iteraciones con fast-check
    - **Validates: Requirements 1.3, 1.4, 4.1, 4.2, 4.3, 4.4**

  - [x] 1.3 Escribir property test: Estructura del output map
    - **Property 2: Estructura del output map**
    - Generar cualquier `data` + cualquier string `testType`
    - Verificar que el mapa retornado contiene exactamente 2 claves: `summary-{t}.json` y `stdout`
    - Mínimo 100 iteraciones con fast-check
    - **Validates: Requirements 1.2, 5.1**

- [x] 2. Nombrado de archivos y fallback
  - [x] 2.1 Implementar lógica de nombrado por `TEST_TYPE` con fallback a `"unknown"`
    - Verificar que la función genera `summary-loadtest.json`, `summary-stresstest.json`, `summary-capacitytest.json`, `summary-stabilitytest.json`
    - Verificar fallback a `summary-unknown.json` cuando `TEST_TYPE` no está disponible
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Escribir property test: Nombrado de archivo sigue el patrón TEST_TYPE
    - **Property 3: Nombrado de archivo sigue el patrón TEST_TYPE**
    - Generar strings arbitrarios para `TEST_TYPE`, incluyendo `undefined`
    - Verificar que la clave del archivo coincide con `summary-{TEST_TYPE}.json` o `summary-unknown.json`
    - Mínimo 100 iteraciones con fast-check
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [x] 2.3 Escribir unit tests para cada perfil conocido y fallback
    - Test: `TEST_TYPE=loadtest` → `summary-loadtest.json`
    - Test: `TEST_TYPE=stresstest` → `summary-stresstest.json`
    - Test: `TEST_TYPE=capacitytest` → `summary-capacitytest.json`
    - Test: `TEST_TYPE=stabilitytest` → `summary-stabilitytest.json`
    - Test: `TEST_TYPE` ausente → `summary-unknown.json`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Checkpoint - Verificar implementación base
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Stdout conciso y property test de metadatos
  - [x] 4.1 Verificar que `stdout` retorna JSON con `test_type` y lista de métricas
    - El contenido de `stdout` debe ser JSON parseable
    - Debe contener `test_type` como string y `metrics` como array de strings
    - El stdout debe ser más conciso que el archivo completo
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Escribir property test: Stdout contiene metadatos del resumen
    - **Property 4: Stdout contiene metadatos del resumen**
    - Generar objetos con `metrics` variado (0 a N métricas con nombres arbitrarios)
    - Verificar que `stdout` parseado contiene `test_type` (string) y `metrics` (array con nombres correctos)
    - Mínimo 100 iteraciones con fast-check
    - **Validates: Requirements 5.2**

- [x] 5. Verificación de aislamiento del comportamiento existente
  - [x] 5.1 Verificar que agregar `handleSummary` no altera el código existente
    - Confirmar que la lógica de filtrado de endpoints permanece sin cambios
    - Confirmar que la generación de escenarios permanece sin cambios
    - Confirmar que los retries solo aplican a stresstest (sin cambios)
    - Confirmar que los thresholds se evalúan igual
    - Confirmar que la validación de `TEST_TYPE` al inicio permanece intacta
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Escribir tests de aislamiento
    - Verificar que `options.scenarios` no se modifica por la presencia de `handleSummary`
    - Verificar que `options.thresholds` permanece sin cambios
    - Verificar que la función `executeWithRetries` no se altera
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Checkpoint final - Validar cobertura completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de corrección usando **fast-check** (mínimo 100 iteraciones cada uno)
- Los unit tests validan ejemplos específicos y edge cases
- Para ejecutar property tests y unit tests en Node.js, se debe extraer la lógica de `handleSummary` de forma testeable con un mock de `__ENV`
- La implementación es aditiva: solo se agrega una función exportada al final de `performancetest.js`, sin modificar código existente
- El lenguaje de implementación es JavaScript (ES modules), consistente con el stack actual del proyecto

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2"] }
  ]
}
```
