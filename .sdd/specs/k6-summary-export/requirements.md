# Requirements Document

## Introduction

Esta funcionalidad agrega la exportación estándar de resumen JSON de K6 al archivo `performancetest.js`, de modo que las importaciones al dashboard sean predecibles y no dependan del análisis del output de terminal.

## Glossary

- **System**: El script de ejecución de performance K6 (`performancetest.js`) que orquesta las pruebas de carga, estrés, capacidad y estabilidad.
- **handleSummary**: Función exportada de K6 que se invoca al finalizar la ejecución para generar un resumen personalizado.
- **TEST_TYPE**: Variable de entorno que identifica el perfil de prueba activo (`loadtest`, `stresstest`, `capacitytest`, `stabilitytest`).
- **Summary_JSON**: Archivo JSON generado al finalizar la ejecución que contiene las métricas completas de K6.
- **Dashboard**: Sistema consumidor que importa los archivos de resumen JSON para visualización de resultados.

## Requirements

### Requirement 1: Generación de archivo JSON de resumen vía handleSummary

**User Story:** As a tester, I want every K6 execution to produce a summary JSON file, so that I can upload it to the dashboard.

#### Acceptance Criteria

1. WHEN a K6 run completes, THE System SHALL execute `handleSummary(data)`.
2. WHEN `handleSummary(data)` executes, THE System SHALL write a Summary_JSON file.
3. WHEN the Summary_JSON file is written, THE System SHALL include the complete K6 `data` object.
4. WHEN the Summary_JSON file is written, THE System SHALL format JSON with stable indentation.

### Requirement 2: Nombrado de archivos por perfil TEST_TYPE

**User Story:** As a tester, I want summary files named by test type, so that I can distinguish load, stress, capacity, and stability results.

#### Acceptance Criteria

1. WHEN `TEST_TYPE` is `loadtest`, THE System SHALL write `summary-loadtest.json`.
2. WHEN `TEST_TYPE` is `stresstest`, THE System SHALL write `summary-stresstest.json`.
3. WHEN `TEST_TYPE` is `capacitytest`, THE System SHALL write `summary-capacitytest.json`.
4. WHEN `TEST_TYPE` is `stabilitytest`, THE System SHALL write `summary-stabilitytest.json`.
5. WHEN `TEST_TYPE` is unavailable during summary generation, THE System SHALL use `summary-unknown.json`.

### Requirement 3: Aislamiento del comportamiento de ejecución existente

**User Story:** As an implementer, I want summary export to be isolated, so that request execution behavior remains unchanged.

#### Acceptance Criteria

1. WHEN summary export is added, THE System SHALL NOT change endpoint filtering behavior.
2. WHEN summary export is added, THE System SHALL NOT change scenario generation behavior.
3. WHEN summary export is added, THE System SHALL NOT change request retry behavior.
4. WHEN summary export is added, THE System SHALL NOT change threshold evaluation behavior.
5. WHEN summary export is added, THE System SHALL keep existing `TEST_TYPE` validation behavior.

### Requirement 4: Preservación de la estructura de métricas K6

**User Story:** As a dashboard implementer, I want summary JSON to preserve K6 metrics and groups, so that dashboards can normalize results safely.

#### Acceptance Criteria

1. WHEN the Summary_JSON is generated, THE System SHALL preserve the `metrics` object from K6.
2. WHEN the Summary_JSON is generated, THE System SHALL preserve `root_group` when K6 provides it.
3. WHEN K6 includes threshold information inside metrics, THE System SHALL preserve that threshold information.
4. WHEN K6 includes tags or group paths, THE System SHALL preserve them without transformation.

### Requirement 5: Mantenimiento del output de terminal stdout

**User Story:** As a tester, I want terminal output to remain useful, so that local CLI execution still gives immediate feedback.

#### Acceptance Criteria

1. WHEN summary export runs, THE System SHALL continue returning a `stdout` entry.
2. WHEN `stdout` is returned, THE System SHALL include concise summary information.
3. WHEN the full Summary_JSON file is created, THE System SHALL NOT require the terminal output to contain the full summary.
