# Requirements Document

## Introduction

Esta funcionalidad define el contrato de configuración JavaScript consumido por `performancetest.js` y producido por la futura UI del config builder. El contrato debe preservar el comportamiento actual del runner K6 mientras permite que las configuraciones generadas sean validadas y revisadas antes de su ejecución.

## Glossary

- **System**: El generador de configuración K6 y su pipeline de validación.
- **Config_File**: Archivo JavaScript ES module (`config.js`) que exporta la configuración de endpoints y perfiles de prueba.
- **Endpoint**: Objeto que describe una transacción HTTP individual incluyendo URL, método, payload, headers y perfiles de prueba asociados.
- **Test_Profile**: Objeto (`loadtest`, `stresstest`, `capacitytest`, `stabilitytest`) que define las etapas de tráfico y umbrales para un tipo de prueba específico.
- **Stage**: Objeto dentro de un perfil que define `duration` (duración temporal) y `target` (número objetivo de usuarios virtuales).
- **Threshold**: Expresión de umbral K6 que define criterios de aprobación/fallo para una métrica específica.
- **Runner**: Script `performancetest.js` que importa y ejecuta la configuración K6.
- **Custom_Metric**: Métrica definida por el proyecto fuera de las métricas built-in de K6 (e.g., `waiting_time`, `Errors`, `Total_Reqs`, `retries`, `transaction_duration`, `transactions_per_second`, `active_vus`).

## Requirements

### Requirement 1: Compatibilidad de Forma del Módulo ES

**User Story:** As a performance tester, I want generated configs to keep the current module shape, so that existing K6 executions continue to work without runner rewrites.

#### Acceptance Criteria

1. WHEN a Config_File is generated, THE System SHALL emit an ES module with `export default`.
2. WHEN a Config_File is generated, THE System SHALL include a root object with an `endpoints` array.
3. WHEN `performancetest.js` imports the generated file, THE System SHALL expose the same `config.endpoints` contract used by the current Runner.
4. WHEN optional Endpoint metadata is present, THE System SHALL keep it non-breaking for the current Runner.

### Requirement 2: Descripción de Transacción HTTP por Endpoint

**User Story:** As a performance tester, I want each endpoint to describe the HTTP transaction, so that the runner can execute realistic API requests.

#### Acceptance Criteria

1. WHEN an Endpoint is exported, THE System SHALL include a non-empty `url`.
2. WHEN an Endpoint is exported, THE System SHALL include a supported `method`.
3. WHEN an Endpoint includes request body data, THE System SHALL represent it in `payload`.
4. WHEN an Endpoint includes request headers, THE System SHALL represent them in `headers`.
5. WHEN an Endpoint is exported, THE System SHALL include `expectedStatus`, `maxRetries`, and `thinkTimeSeconds`.
6. WHEN Endpoint metadata is supplied, THE System SHALL include `name` and `description` without requiring the Runner to consume them.

### Requirement 3: Perfiles de Prueba Independientes por Endpoint

**User Story:** As a performance tester, I want each endpoint to define only the test profiles it supports, so that load, stress, capacity, and stability tests can be executed independently.

#### Acceptance Criteria

1. WHEN an Endpoint supports load testing, THE System SHALL include a `loadtest` Test_Profile.
2. WHEN an Endpoint supports stress testing, THE System SHALL include a `stresstest` Test_Profile.
3. WHEN an Endpoint supports capacity testing, THE System SHALL include a `capacitytest` Test_Profile.
4. WHEN an Endpoint supports stability testing, THE System SHALL include a `stabilitytest` Test_Profile.
5. WHEN `TEST_TYPE` is selected at runtime, THE System SHALL allow the current Runner to resolve endpoints through `endpoint[TEST_TYPE]`.
6. WHEN a Test_Profile is not configured for an Endpoint, THE System SHALL omit that profile without invalidating other profiles.

### Requirement 4: Definición de Stages y Thresholds por Perfil

**User Story:** As a performance tester, I want each test profile to define traffic stages and thresholds, so that K6 can control load shape and pass/fail criteria.

#### Acceptance Criteria

1. WHEN a Test_Profile is exported, THE System SHALL include a `stages` array.
2. WHEN a Stage is exported, THE System SHALL include `duration` and `target`.
3. WHEN Thresholds are configured for a profile, THE System SHALL export them as a metric-keyed object.
4. WHEN a Threshold metric is exported, THE System SHALL represent its rules as an array of K6 threshold expressions.
5. WHEN Custom_Metrics are used, THE System SHALL preserve their metric names in threshold keys.

### Requirement 5: Reglas de Validación Pre-Ejecución

**User Story:** As an implementer, I want validation rules for generated configs, so that invalid configs are blocked before K6 execution.

#### Acceptance Criteria

1. WHEN `url` is empty or not an absolute URL, THE System SHALL reject the Config_File before export.
2. WHEN `method` is not `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`, THE System SHALL reject the Config_File before export.
3. WHEN `headers` is not a JSON object, THE System SHALL reject the Config_File before export.
4. WHEN `payload` is not valid JSON, THE System SHALL reject the Config_File before export.
5. WHEN `expectedStatus` is outside `100` through `599`, THE System SHALL reject the Config_File before export.
6. WHEN a selected Test_Profile has no Stages, THE System SHALL reject the Config_File before export.
7. WHEN a Stage has an empty duration or negative target, THE System SHALL reject the Config_File before export.
8. WHEN a Threshold expression is empty, THE System SHALL reject the Config_File before export.

### Requirement 6: Preservación de Métricas del Proyecto

**User Story:** As an implementer, I want generated configs to preserve project metrics, so that dashboards and thresholds remain aligned with the runner.

#### Acceptance Criteria

1. WHEN Thresholds reference built-in K6 metrics, THE System SHALL preserve those metric keys exactly.
2. WHEN Thresholds reference `waiting_time`, THE System SHALL preserve that Custom_Metric key exactly.
3. WHEN Thresholds reference `Errors`, THE System SHALL preserve that Custom_Metric key exactly.
4. WHEN Thresholds reference `Total_Reqs`, `retries`, `transaction_duration`, `transactions_per_second`, or `active_vus`, THE System SHALL preserve those Custom_Metric keys exactly.
