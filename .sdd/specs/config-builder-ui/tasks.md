# Implementation Plan: Config Builder UI

## Overview

Plan de implementación para el Config Builder UI, una aplicación React + TypeScript + Vite que corre en el navegador sin backend. La app guía a los testers en la creación de archivos `config.js` válidos para K6, con validación en tiempo real, vista previa del código generado y descarga directa. El código fuente vive en `src/` con componentes React, hooks, servicios puros y modelos TypeScript. Los tests viven en `tests/unit/`, `tests/properties/` y `tests/integration/`.

## Tasks

- [x] 1. Scaffolding del proyecto React + TypeScript + Vite
  - [x] 1.1 Crear `package.json` con dependencias del proyecto
    - React 18+, react-dom, TypeScript, Vite, @vitejs/plugin-react
    - Dependencias de desarrollo: vitest, @testing-library/react, @testing-library/jest-dom, jsdom, fast-check
    - Scripts: dev, build, preview, test, test:coverage
    - _Requirements: 1.1_

  - [x] 1.2 Crear archivos de configuración raíz
    - `tsconfig.json` con strict mode, JSX react-jsx, paths aliases
    - `vite.config.ts` con plugin React
    - `vitest.config.ts` con environment jsdom, include `tests/**/*.test.{ts,tsx}`
    - `src/index.html` con div root y script de fallback para navegadores sin ES modules
    - _Requirements: 1.1, 1.5_

  - [x] 1.3 Crear estructura de directorios y entry points
    - `src/main.tsx` con ReactDOM.createRoot y render de `<App />`
    - `src/App.tsx` placeholder con ConfigProvider wrapper
    - Directorios vacíos: `src/components/`, `src/hooks/`, `src/models/`, `src/services/`, `src/context/`, `src/utils/`, `src/assets/styles/`
    - Directorios de tests: `tests/unit/`, `tests/properties/`, `tests/integration/`
    - _Requirements: 1.1, 1.2_

- [x] 2. Implementar modelos e interfaces TypeScript
  - [x] 2.1 Crear interfaces del modelo de datos
    - `src/models/AppState.ts`: interface `AppState` con `endpoints: EndpointDraft[]` y `activeEndpointId: string | null`
    - `src/models/EndpointDraft.ts`: interface `EndpointDraft` con todos los campos (id, name, url, method, headersText, payloadText, expectedStatus, maxRetries, thinkTimeSeconds, profiles) y tipo `HttpMethod`
    - `src/models/ProfileDraft.ts`: interface `ProfileDraft` (type, enabled, stages, thresholds) y tipo `ProfileType`
    - `src/models/StageDraft.ts`: interface `StageDraft` (duration, target)
    - `src/models/ThresholdDraft.ts`: interface `ThresholdDraft` (metric, expressions)
    - `src/models/ValidationResult.ts`: interfaces `FieldError` y `ValidationResult`
    - _Requirements: 2.1, 2.2, 3.1, 4.1, 5.1_

  - [x] 2.2 Crear constantes y tipos utilitarios
    - `src/utils/constants.ts`: lista de métricas K6 sugeridas, límites (MAX_ENDPOINTS=50, MAX_STAGES=20, MAX_EXPRESSIONS=10), regex de duración K6, métodos HTTP permitidos
    - _Requirements: 2.1, 4.2, 5.1, 5.2_

- [x] 3. Implementar servicios puros (lógica de negocio)
  - [x] 3.1 Crear `src/services/defaults.service.ts`
    - Implementar `createEndpoint(existingNames: string[]): EndpointDraft` con defaults: method=POST, headersText=`{"Content-Type":"application/json"}`, payloadText=`{}`, expectedStatus=200, maxRetries=3, thinkTimeSeconds=1, url="" (inválido), 4 perfiles deshabilitados
    - Implementar `createStage(): StageDraft` con defaults: duration="30s", target=1
    - Implementar `duplicateEndpoint(source: EndpointDraft): EndpointDraft` con id nuevo y nombre modificado indicando copia
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 2.3_

  - [x] 3.2 Crear `src/services/validation.service.ts`
    - Implementar `validateUrl(url: string): string | null`: acepta si comienza con `http://` o `https://` y no está vacía
    - Implementar `validateField(fieldName: string, value: unknown, constraints): string | null`: validar expectedStatus (100–599), maxRetries (0–10), thinkTimeSeconds (0–60), target (0–10000)
    - Implementar `validateMethod(method: string): string | null`: restringir a GET, POST, PUT, PATCH, DELETE
    - Implementar `validateJson(text: string, requireObject?: boolean): string | null`: validar JSON parseable, opcionalmente que sea objeto
    - Implementar `validateDuration(duration: string): string | null`: formato K6 (ej. "30s", "2m", "1h")
    - Implementar `validateMetricName(name: string): string | null`: 1–128 caracteres, solo letras/dígitos/guiones bajos, no solo whitespace
    - Implementar `validateThresholdExpression(expr: string): string | null`: no vacía ni solo whitespace
    - Implementar `validateEndpoint(draft: EndpointDraft): ValidationResult` y `validateExportReady(state: AppState): ValidationResult`
    - Mensajes de error descriptivos indicando rangos válidos
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 4.3, 4.4, 5.3, 5.4, 5.6, 7.9_

  - [x] 3.3 Crear `src/services/serializer.service.ts`
    - Implementar `serialize(state: AppState): string`: genera string completo de `config.js` como ES module (`export default { endpoints: [...] }`)
    - Implementar `serializeEndpoint(draft: EndpointDraft): Record<string, unknown>`: convierte un EndpointDraft a su representación de salida
    - Implementar `serializeProfile(profile: ProfileDraft): Record<string, unknown> | null`: retorna objeto del perfil o null si deshabilitado
    - Claves ordenadas alfabéticamente para determinismo
    - Indentación consistente de 2 espacios
    - Para método GET: serializar payload como query params en la URL
    - Perfiles deshabilitados se omiten del output
    - Thresholds se serializan como arrays de strings por métrica
    - _Requirements: 3.5, 4.5, 4.6, 5.5, 6.1, 6.4_

- [x] 4. Checkpoint - Verificar modelos y servicios
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 5. Implementar property tests de servicios
  - [x] 5.1 Escribir property test para validación de campos numéricos y URL
    - **Property 1: Validación de campos numéricos y URL**
    - **Validates: Requirements 3.1, 3.2, 3.7, 3.8**
    - Archivo: `tests/properties/validation.property.test.ts`
    - Generadores: enteros aleatorios para campos numéricos, strings para URL

  - [x] 5.2 Escribir property test para validación JSON
    - **Property 2: Validación JSON de headers y payload**
    - **Validates: Requirements 3.3, 3.4**
    - Archivo: `tests/properties/validation.property.test.ts`
    - Generadores: strings JSON válidos/inválidos, objetos, arrays, primitivos

  - [x] 5.3 Escribir property test para formato duración K6 y métricas
    - **Property 3: Validación de formato de duración K6 y nombre de métrica**
    - **Validates: Requirements 4.3, 4.4, 5.3**
    - Archivo: `tests/properties/validation.property.test.ts`
    - Generadores: strings de duración, strings de nombre de métrica

  - [x] 5.4 Escribir property test para serialización produce JS válido
    - **Property 4: Serialización produce JavaScript sintácticamente válido**
    - **Validates: Requirements 6.1**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: estados `AppState` válidos aleatorios

  - [x] 5.5 Escribir property test para determinismo de serialización
    - **Property 5: Serialización es determinista (idempotente)**
    - **Validates: Requirements 6.4**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: estados `AppState` válidos aleatorios

  - [x] 5.6 Escribir property test para identidad preview/download
    - **Property 6: Identidad entre preview y download**
    - **Validates: Requirements 6.2**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: estados válidos aleatorios

  - [x] 5.7 Escribir property test para export-readiness
    - **Property 7: Export-readiness bloquea estados inválidos**
    - **Validates: Requirements 6.3, 2.5, 4.7, 4.8, 5.4, 5.6, 7.8, 7.9**
    - Archivo: `tests/properties/validation.property.test.ts`
    - Generadores: estados con errores inyectados aleatoriamente

  - [x] 5.8 Escribir property test para perfiles deshabilitados
    - **Property 8: Perfiles deshabilitados se omiten de la salida**
    - **Validates: Requirements 4.6**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: estados con combinaciones de enabled/disabled

  - [x] 5.9 Escribir property test para orden de stages
    - **Property 9: El orden de stages se preserva en la serialización**
    - **Validates: Requirements 4.5**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: stages + permutaciones aleatorias

  - [x] 5.10 Escribir property test para GET query params
    - **Property 10: Serialización de GET con query params**
    - **Validates: Requirements 3.5**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: objetos JSON con pares clave-valor aleatorios

  - [x] 5.11 Escribir property test para duplicación de endpoints
    - **Property 11: Duplicación preserva todos los campos**
    - **Validates: Requirements 2.3**
    - Archivo: `tests/properties/state.property.test.ts`
    - Generadores: endpoints con campos aleatorios

  - [x] 5.12 Escribir property test para defaults de creación
    - **Property 12: Defaults correctos en creación**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**
    - Archivo: `tests/properties/state.property.test.ts`
    - Generadores: secuencias de creación

  - [x] 5.13 Escribir property test para thresholds como arrays
    - **Property 13: Thresholds se serializan como arrays de strings**
    - **Validates: Requirements 5.5**
    - Archivo: `tests/properties/serialization.property.test.ts`
    - Generadores: thresholds aleatorios

  - [x] 5.14 Escribir property test para límites de colección
    - **Property 14: Límites de colección**
    - **Validates: Requirements 2.1, 4.2, 5.2**
    - Archivo: `tests/properties/state.property.test.ts`
    - Generadores: secuencias de N operaciones

  - [x] 5.15 Escribir property test para comandos sugeridos
    - **Property 15: Comandos sugeridos por perfil habilitado**
    - **Validates: Requirements 6.5**
    - Archivo: `tests/properties/state.property.test.ts`
    - Generadores: combinaciones de perfiles habilitados

- [x] 6. Implementar Context y Reducer (gestión de estado)
  - [x] 6.1 Crear `src/context/configReducer.ts`
    - Implementar reducer con acciones: ADD_ENDPOINT, UPDATE_ENDPOINT, REMOVE_ENDPOINT, DUPLICATE_ENDPOINT, SET_ACTIVE_ENDPOINT, ADD_STAGE, REMOVE_STAGE, REORDER_STAGES, UPDATE_STAGE, TOGGLE_PROFILE, ADD_THRESHOLD, REMOVE_THRESHOLD, UPDATE_THRESHOLD_EXPRESSIONS
    - Respetar límites: máximo 50 endpoints, 20 stages por perfil, 10 expresiones por métrica
    - Usar `defaults.service.ts` para crear endpoints y stages con valores correctos
    - _Requirements: 1.3, 2.1, 2.3, 2.4, 4.2, 4.5, 5.2, 7.1–7.8_

  - [x] 6.2 Crear `src/context/ConfigContext.tsx`
    - Implementar ConfigProvider con useReducer
    - Exponer estado y dispatch vía Context API
    - Estado inicial: lista vacía de endpoints, activeEndpointId null
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 7. Implementar hooks personalizados
  - [x] 7.1 Crear `src/hooks/useConfig.ts`
    - Hook principal de acceso al contexto: retorna state, dispatch, y acciones envueltas (addEndpoint, removeEndpoint, duplicateEndpoint, etc.)
    - _Requirements: 1.3, 2.1, 2.3, 2.4_

  - [x] 7.2 Crear `src/hooks/useValidation.ts`
    - Hook que ejecuta validación por campo usando `validation.service.ts`
    - Retorna errores actuales y función para validar un campo específico
    - _Requirements: 3.6, 3.7, 3.8, 7.9_

  - [x] 7.3 Crear `src/hooks/useDebounce.ts`
    - Hook de debounce genérico para ejecutar validación dentro de 500ms del cambio
    - _Requirements: 3.6_

- [x] 8. Checkpoint - Verificar estado y hooks
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 9. Implementar componentes React
  - [x] 9.1 Crear componentes comunes
    - `src/components/common/ConfirmDialog.tsx`: modal de confirmación reutilizable
    - `src/components/common/ValidationMessage.tsx`: mensaje de error inline debajo de campos
    - `src/assets/styles/global.css`: estilos globales, layout compacto operacional
    - _Requirements: 2.4, 3.6_

  - [x] 9.2 Crear `src/components/EndpointList/EndpointList.tsx`
    - Lista lateral de endpoints con indicación visual del activo
    - Botones para crear, duplicar, eliminar endpoints
    - Mostrar mensaje cuando no hay endpoints y deshabilitar exportación
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.3 Crear componentes del EndpointEditor
    - `src/components/EndpointEditor/EndpointEditor.tsx`: contenedor del editor del endpoint activo
    - `src/components/EndpointEditor/RequestFields.tsx`: campos URL, method (select), expectedStatus, maxRetries, thinkTimeSeconds con validación inline
    - `src/components/EndpointEditor/HeadersEditor.tsx`: textarea JSON con validación (debe ser objeto)
    - `src/components/EndpointEditor/PayloadEditor.tsx`: textarea JSON con validación, etiqueta dinámica para GET (query params)
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 9.4 Crear componentes del ProfileEditor
    - `src/components/ProfileEditor/ProfileTabs.tsx`: 4 toggles para perfiles (loadtest, stresstest, capacitytest, stabilitytest)
    - `src/components/ProfileEditor/StagesEditor.tsx`: lista de stages con agregar, eliminar, reordenar (drag/move), validación de duration y target
    - `src/components/ProfileEditor/ThresholdsEditor.tsx`: selector de métricas K6 con sugerencias, lista de expresiones por métrica, validación inline
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 9.5 Crear componentes de PreviewPanel
    - `src/components/PreviewPanel/PreviewPanel.tsx`: vista previa del config.js generado con indentación, botón de descarga (deshabilitado si inválido), listado de errores pendientes
    - `src/components/PreviewPanel/CommandSuggestions.tsx`: comandos sugeridos `k6 run -e TEST_TYPE=<profile> performancetest.js` por cada perfil habilitado
    - _Requirements: 6.1, 6.3, 6.5_

- [x] 10. Implementar utilidad de descarga y wiring final
  - [x] 10.1 Crear `src/utils/downloader.ts`
    - Implementar `download(filename: string, content: string): void`: crear Blob y link de descarga
    - El contenido descargado debe ser byte-por-byte idéntico al preview
    - _Requirements: 6.2_

  - [x] 10.2 Integrar App.tsx con todos los componentes
    - Layout principal: sidebar (EndpointList) + editor (EndpointEditor + ProfileEditor) + panel de revisión (PreviewPanel)
    - Conectar ConfigProvider, useConfig, useValidation en los componentes
    - Validar que la exportación se bloquea cuando el estado es inválido
    - _Requirements: 1.1, 1.2, 1.3, 6.3_

- [x] 11. Checkpoint - Verificar integración de componentes
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 12. Escribir unit tests y tests de integración
  - [x] 12.1 Escribir unit tests para servicios
    - `tests/unit/validation.service.test.ts`: tests de ejemplo para URL vacía, JSON malformado, campos fuera de rango, duración inválida
    - `tests/unit/serializer.service.test.ts`: tests de ejemplo para estructura de salida, indentación, claves ordenadas, omisión de perfiles deshabilitados
    - `tests/unit/defaults.service.test.ts`: tests para valores por defecto correctos, duplicación
    - _Requirements: 3.1–3.8, 6.1, 6.4, 7.1–7.8_

  - [x] 12.2 Escribir unit tests para el reducer
    - `tests/unit/configReducer.test.ts`: tests para cada acción del reducer, respeto de límites, estado inicial
    - _Requirements: 2.1, 2.3, 2.4, 4.2, 4.5, 5.2_

  - [x] 12.3 Escribir unit tests para componentes React
    - `tests/unit/components/EndpointList.test.tsx`: crear, seleccionar, duplicar, eliminar endpoints
    - `tests/unit/components/EndpointEditor.test.tsx`: edición de campos con validación
    - `tests/unit/components/ProfileTabs.test.tsx`: toggle de perfiles
    - `tests/unit/components/PreviewPanel.test.tsx`: vista previa y descarga
    - _Requirements: 1.2, 2.1, 2.2, 2.4, 4.1, 6.1, 6.3_

  - [x] 12.4 Escribir tests de integración
    - `tests/integration/configBuilder.integration.test.tsx`: flujo end-to-end con React Testing Library
    - Crear endpoint → editar campos → habilitar perfil → agregar stages → preview → descargar
    - Verificar persistencia de estado durante navegación interna
    - Verificar que validación se ejecuta dentro de 500ms
    - _Requirements: 1.3, 1.4, 3.6_

- [x] 13. Checkpoint final - Verificar todos los tests pasan
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requirements específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud usando fast-check (mínimo 100 iteraciones)
- Los unit tests validan ejemplos específicos y casos borde
- Stack: React 18+ con TypeScript, Vite como build tool, Vitest como test runner, fast-check para PBT
- La configuración generada debe ser compatible con `import config from "./config.js"`
- Perfiles soportados: loadtest, stresstest, capacitytest, stabilitytest
- Los servicios (`validation.service.ts`, `serializer.service.ts`, `defaults.service.ts`) son funciones puras testeables sin React
- El estado se gestiona con Context API + useReducer (sin Redux ni Zustand en v1)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "5.13", "5.14", "5.15"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "9.4", "9.5"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3", "12.4"] }
  ]
}
```
