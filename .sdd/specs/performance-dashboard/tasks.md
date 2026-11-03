# Implementation Plan: Performance Dashboard

## Overview

Plan de implementación para el dashboard de rendimiento K6. La aplicación utiliza React 18+ con TypeScript, Vite como build tool, Vitest como test runner y fast-check para property-based testing. La estructura sigue la convención: código fuente en `src/` (components, hooks, models, services, context) y tests en `tests/` (unit, properties, integration). No requiere backend — todo el procesamiento es local en el navegador.

## Tasks

- [x] 1. Configurar proyecto React + TypeScript + Vite
  - [x] 1.1 Crear archivos de configuración del proyecto
    - Crear `package.json` con dependencias: react, react-dom, typescript, vite, vitest, fast-check, @testing-library/react, jsdom
    - Crear `tsconfig.json` con strict mode, paths y resolución de módulos
    - Crear `vite.config.ts` con plugin de React
    - Crear `vitest.config.ts` con environment jsdom, globals true, include de tests
    - Crear `src/index.html` como HTML host de Vite
    - _Requirements: 1.1, 7.1_

  - [x] 1.2 Crear estructura de directorios y archivos de entrada
    - Crear `src/main.tsx` como entry point (ReactDOM.createRoot)
    - Crear `src/App.tsx` como componente raíz con ReportContext provider
    - Crear directorios: `src/components/`, `src/hooks/`, `src/models/`, `src/services/`, `src/context/`, `src/assets/styles/`
    - Crear directorios de test: `tests/unit/`, `tests/properties/`, `tests/integration/`, `tests/unit/components/`
    - _Requirements: 1.1, 7.1_

- [x] 2. Implementar modelos e interfaces TypeScript
  - [x] 2.1 Definir interfaces del modelo de datos
    - Implementar `src/models/report.ts` con interfaces: `ReportModel`, `Kpi`, `KpiStatus`, `ThresholdResult`, `ChartSeries`, `TestType`
    - Implementar `src/models/errors.ts` con tipos: `ParseErrorType`, `ParseError`, `Result<T, E>`
    - Implementar `src/models/metrics.ts` con la tabla de mapeo de métricas como constante tipada y tipo `RawSummary`
    - _Requirements: 1.5, 2.1-2.9_

- [x] 3. Implementar servicios de procesamiento (lógica pura)
  - [x] 3.1 Implementar `src/services/parseAndValidate.ts`
    - Parsear texto con `JSON.parse` envuelto en try/catch
    - Retornar `{ ok: false, error: { type: "INVALID_JSON", message } }` si falla el parsing
    - Validar presencia de propiedad `metrics` en el objeto parseado
    - Retornar `{ ok: false, error: { type: "MISSING_METRICS", message } }` si no existe `metrics`
    - Retornar `{ ok: true, data: rawSummary }` si la validación pasa
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 3.2 Implementar `src/services/classifyTestType.ts`
    - Buscar keywords en el nombre de archivo: `loadtest`, `stresstest`, `capacitytest`, `stabilitytest`
    - Retornar el tipo correspondiente si se encuentra exactamente un keyword
    - Retornar `"unknown"` si no se encuentra ningún keyword o si hay ambigüedad
    - Comparación case-insensitive
    - _Requirements: 5.1-5.5_

  - [x] 3.3 Implementar `src/services/extractKpis.ts`
    - Recorrer la tabla de mapeo de métricas para extraer cada KPI
    - Navegar las rutas de acceso (e.g., `http_reqs.values.count`) de forma segura
    - Aplicar fallback a ruta alternativa cuando la primaria no existe
    - Retornar `"N/A"` como valor cuando ni la ruta primaria ni el fallback existen
    - Formatear valores numéricos con unidades apropiadas (`ms`, `req/s`, `%`, `count`)
    - _Requirements: 2.1-2.10_

  - [x] 3.4 Implementar `src/services/extractThresholds.ts`
    - Iterar sobre cada métrica buscando propiedad `thresholds`
    - Para cada threshold encontrado, extraer nombre de métrica, expresión y estado `ok`
    - Mapear `ok: true` a `passed: true` y `ok: false` a `passed: false`
    - Retornar array vacío si no hay thresholds en ninguna métrica
    - _Requirements: 3.1-3.5_

  - [x] 3.5 Implementar `src/services/buildCharts.ts`
    - Construir serie de duración (avg, p95, p99) desde `http_req_duration`
    - Construir serie de fallos desde `http_req_failed`
    - Construir serie de conteos desde `http_reqs` e `iterations`
    - Incluir métricas custom soportadas como series adicionales
    - Retornar array de `ChartSeries` para renderizado
    - _Requirements: 4.1-4.5_

  - [x] 3.6 Implementar `src/services/normalize.ts`
    - Invocar `classifyTestType(fileName)` para determinar tipo de prueba
    - Invocar `extractKpis(raw.metrics)` para obtener los KPIs
    - Invocar `extractThresholds(raw.metrics)` para obtener resultados de thresholds
    - Invocar `buildCharts(raw.metrics)` para construir series de gráficos
    - Ensamblar y retornar el objeto `ReportModel` completo
    - _Requirements: 1.5, 2.1-2.10_

  - [x] 3.7 Implementar `src/services/exportHtml.ts`
    - Generar string HTML completo con `<!DOCTYPE html>`, estilos inline, y datos embebidos
    - Embedir el `ReportModel` como JSON serializado en un `<script>` tag
    - Incluir código de renderizado inline para que el HTML se auto-presente
    - Asegurar que el HTML exportado no requiere el archivo JSON original
    - _Requirements: 6.1-6.4_

- [x] 4. Checkpoint - Verificar compilación de modelos y servicios
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar property tests para servicios
  - [x] 5.1 Escribir property test para rechazo de JSON inválido
    - **Property 1: Rechazo de JSON inválido**
    - Archivo: `tests/properties/parse.property.test.ts`
    - Generar strings arbitrarios que no sean JSON válido con `fc.string()` filtrado
    - Verificar que `parseAndValidate` siempre retorna error tipo `INVALID_JSON`
    - **Validates: Requirements 1.3**

  - [x] 5.2 Escribir property test para rechazo de JSON sin métricas
    - **Property 2: Rechazo de JSON sin métricas**
    - Archivo: `tests/properties/parse.property.test.ts`
    - Generar objetos JSON válidos sin propiedad `metrics` con `fc.record()`
    - Verificar que `parseAndValidate` siempre retorna error tipo `MISSING_METRICS`
    - **Validates: Requirements 1.4**

  - [x] 5.3 Escribir property test para normalización produce modelo válido
    - **Property 3: Normalización produce modelo válido**
    - Archivo: `tests/properties/parse.property.test.ts`
    - Generar objetos K6 summary JSON válidos con fast-check
    - Verificar que `normalize` produce ReportModel con fileName no vacío, testType definido, y arrays inicializados
    - **Validates: Requirements 1.5**

  - [x] 5.4 Escribir property test para extracción correcta de KPIs
    - **Property 4: Extracción correcta de KPIs**
    - Archivo: `tests/properties/kpi.property.test.ts`
    - Generar objetos metrics con subconjuntos aleatorios de métricas soportadas
    - Verificar que cada KPI presente corresponde al valor en la ruta esperada
    - **Validates: Requirements 2.1-2.9**

  - [x] 5.5 Escribir property test para degradación elegante de métricas ausentes
    - **Property 5: Degradación elegante para métricas ausentes**
    - Archivo: `tests/properties/kpi.property.test.ts`
    - Generar objetos metrics con métricas faltantes aleatorias
    - Verificar que los KPIs faltantes producen valor `"N/A"` sin lanzar errores
    - **Validates: Requirements 2.10**

  - [x] 5.6 Escribir property test para estado de threshold
    - **Property 6: Estado de threshold corresponde al booleano ok**
    - Archivo: `tests/properties/threshold.property.test.ts`
    - Generar métricas con thresholds de estado aleatorio (ok: true/false)
    - Verificar que `ThresholdResult.passed` corresponde exactamente al valor `ok` original
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.7 Escribir property test para preservación del nombre de métrica
    - **Property 7: Preservación del nombre de métrica en thresholds**
    - Archivo: `tests/properties/threshold.property.test.ts`
    - Generar métricas con nombres aleatorios que contengan thresholds
    - Verificar que el campo `metric` del resultado contiene el nombre original
    - **Validates: Requirements 3.5**

  - [x] 5.8 Escribir property test para clasificación de tipo de prueba
    - **Property 8: Clasificación de tipo de prueba por nombre de archivo**
    - Archivo: `tests/properties/classify.property.test.ts`
    - Generar nombres de archivo con/sin keywords conocidos
    - Verificar que retorna tipo correcto para un keyword, `"unknown"` sin keywords
    - **Validates: Requirements 5.1-5.5**

  - [x] 5.9 Escribir property test para round-trip de exportación HTML
    - **Property 9: Round-trip de exportación HTML**
    - Archivo: `tests/properties/export.property.test.ts`
    - Generar instancias aleatorias de `ReportModel` con arbitraries compuestos
    - Verificar que el HTML generado contiene los datos embebidos y pueden reconstituirse
    - **Validates: Requirements 6.2, 6.3**

- [x] 6. Implementar React Context y hooks de orquestación
  - [x] 6.1 Implementar `src/context/ReportContext.tsx`
    - Crear Context con estado: `report: ReportModel | null`, `error: ParseError | null`
    - Crear Provider que expone `loadFile`, `reset` y estado actual
    - _Requirements: 1.1, 1.5_

  - [x] 6.2 Implementar `src/hooks/useFileReader.ts`
    - Implementar hook que retorna `readFile(file: File) => Promise<string>`
    - Manejar estado de lectura (`isReading`) y errores
    - Usar `FileReader` API para lectura local exclusiva
    - _Requirements: 1.2, 7.1_

  - [x] 6.3 Implementar `src/hooks/useReportLoader.ts`
    - Hook orquestador: invocar `parseAndValidate` → `normalize`
    - Exponer `loadFile(text, fileName)`, `report`, `error`, `reset`
    - Manejar propagación de errores al estado
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 6.4 Implementar `src/hooks/useBlobDownload.ts`
    - Implementar `download(content, fileName, mimeType)` usando `Blob` y `URL.createObjectURL`
    - Crear y disparar click en anchor temporal para descarga
    - Revocar object URL después de descarga
    - _Requirements: 6.1, 7.3_

- [x] 7. Implementar componentes React
  - [x] 7.1 Implementar `src/components/FileUploader.tsx`
    - Componente con `<input type="file" accept=".json">` controlado
    - Invocar `onFileLoaded(text, fileName)` cuando el archivo se lee
    - Usar `useFileReader` internamente
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 7.2 Implementar `src/components/KpiCard.tsx` y `src/components/KpiGrid.tsx`
    - `KpiCard`: Tarjeta individual con label, valor formateado, unidad y estado visual
    - `KpiGrid`: Grid responsivo que renderiza lista de `Kpi[]` como tarjetas
    - Mostrar `"N/A"` con estilo neutral para métricas no disponibles
    - _Requirements: 2.1-2.10_

  - [x] 7.3 Implementar `src/components/ThresholdTable.tsx`
    - Renderizar tabla de thresholds con indicadores visuales pass/fail
    - Ocultar sección y mostrar estado neutral cuando array de thresholds está vacío
    - Preservar nombre de la métrica en cada fila
    - _Requirements: 3.1-3.5_

  - [x] 7.4 Implementar `src/components/ChartPanel.tsx`
    - Renderizar gráficos usando Canvas o SVG inline (sin librerías externas)
    - Implementar gráficos de barra/agregados para datos de resumen
    - Mostrar leyendas y labels para cada serie
    - _Requirements: 4.1-4.5_

  - [x] 7.5 Implementar `src/components/TestContextBanner.tsx`
    - Mostrar tipo de prueba inferido como badge/banner
    - Mostrar nombre del archivo original como referencia
    - _Requirements: 5.1-5.5_

  - [x] 7.6 Implementar `src/components/ExportButton.tsx`
    - Botón deshabilitado cuando no hay modelo cargado
    - Al hacer click, invocar `exportHtml(model)` y disparar descarga vía `useBlobDownload`
    - _Requirements: 6.1-6.4_

  - [x] 7.7 Implementar `src/components/DashboardLayout.tsx` y estilos CSS Modules
    - Layout principal que organiza: Toolbar (FileUploader + ExportButton), TestContextBanner, KpiGrid, ThresholdTable, ChartPanel
    - Crear `src/assets/styles/dashboard.module.css` con estilos responsivos
    - _Requirements: 1.1, 2.1-2.10, 3.1-3.5, 4.1-4.5_

- [x] 8. Checkpoint - Verificar renderizado de componentes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integración final y wiring del pipeline completo
  - [x] 9.1 Conectar pipeline completo en `src/App.tsx`
    - Wiring: FileUploader → useReportLoader (parseAndValidate → normalize) → ReportContext → DashboardLayout
    - Wiring: ExportButton → exportHtml → useBlobDownload → descarga
    - Manejar errores de cada etapa con mensajes al usuario en la UI
    - _Requirements: 1.1-1.5, 7.1_

  - [x] 9.2 Verificar ausencia de comunicación externa
    - Confirmar que no existen llamadas `fetch`, `XMLHttpRequest`, ni `WebSocket` en el código fuente
    - Confirmar que `useFileReader` usa solo `FileReader` local
    - Confirmar que `useBlobDownload` usa solo `Blob` y `URL.createObjectURL`
    - _Requirements: 7.1-7.3_

  - [x] 9.3 Escribir tests unitarios para componentes React
    - Archivo: `tests/unit/components/FileUploader.test.tsx` — renderiza input, dispara carga
    - Archivo: `tests/unit/components/KpiCard.test.tsx` — muestra valor y estado
    - Archivo: `tests/unit/components/ThresholdTable.test.tsx` — muestra pass/fail
    - Archivo: `tests/unit/components/ExportButton.test.tsx` — disabled sin report, enabled con report
    - _Requirements: 1.1, 2.1-2.10, 3.1-3.5, 6.1, 6.4_

  - [x] 9.4 Escribir tests de integración del pipeline
    - Archivo: `tests/integration/pipeline.integration.test.ts`
    - Verificar flujo completo desde JSON válido hasta ReportModel normalizado
    - Verificar flujo de exportación desde modelo hasta HTML generado
    - Verificar que no se realizan requests de red durante import y export
    - _Requirements: 1.1-1.5, 6.1-6.4, 7.1-7.3_

- [x] 10. Checkpoint final - Verificar todo el sistema
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requirements específicos para trazabilidad.
- Los checkpoints aseguran validación incremental del progreso.
- Los property tests validan propiedades universales de correctitud definidas en el diseño.
- Los tests unitarios validan ejemplos específicos y edge cases.
- La implementación usa React 18+ con TypeScript strict mode y Vite como bundler.
- La librería fast-check se usa para property-based testing; Vitest como test runner.
- La estructura de código fuente: `src/` con subdirectorios components, hooks, models, services, context.
- Los tests viven en `tests/unit/`, `tests/properties/` y `tests/integration/`.
- Los servicios son funciones TypeScript puras, testeables sin React.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["3.6", "3.7"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 8, "tasks": ["7.7"] },
    { "id": 9, "tasks": ["9.1", "9.2"] },
    { "id": 10, "tasks": ["9.3", "9.4"] }
  ]
}
```
