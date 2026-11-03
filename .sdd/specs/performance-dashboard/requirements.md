# Requirements Document

## Introduction

Esta funcionalidad provee un dashboard local en el navegador que importa archivos JSON de resumen de K6 y presenta los resultados de rendimiento mediante tarjetas KPI, estado de thresholds, gráficos y reportes HTML exportables.

## Glossary

- **System**: La aplicación web local (dashboard de rendimiento) que se ejecuta en el navegador del usuario.
- **K6_Summary_JSON**: Archivo JSON generado por K6 mediante `handleSummary(data)` que contiene métricas agregadas de una ejecución de prueba.
- **KPI_Card**: Componente visual que muestra un indicador clave de rendimiento en formato de tarjeta.
- **Threshold**: Criterio de aceptación definido en la configuración de K6 que determina si una métrica cumple con los límites esperados.
- **Metric**: Valor numérico recolectado por K6 durante la ejecución (por ejemplo, `http_reqs`, `http_req_duration`).
- **HTML_Report**: Archivo HTML autónomo exportado por el dashboard que contiene el reporte completo sin dependencias externas.

## Requirements

### Requirement 1: Carga de archivo JSON

**User Story:** As a tester, I want to upload a K6 summary JSON file, so that I can inspect performance results without reading raw JSON.

#### Acceptance Criteria

1. WHEN the dashboard is opened, THE System SHALL provide a JSON file upload control.
2. WHEN the user uploads a file, THE System SHALL read the file locally in the browser.
3. WHEN the file is not valid JSON, THE System SHALL show a parse error.
4. WHEN the JSON does not contain a `metrics` object, THE System SHALL show an unsupported file error.
5. WHEN the JSON is valid K6_Summary_JSON data, THE System SHALL normalize metrics for rendering.

### Requirement 2: Tarjetas KPI

**User Story:** As a tester, I want top-level KPI cards, so that I can quickly understand whether a run performed acceptably.

#### Acceptance Criteria

1. WHEN `http_reqs` is available, THE System SHALL show total requests.
2. WHEN `http_req_failed` is available, THE System SHALL show failed request rate.
3. WHEN `http_req_duration` is available, THE System SHALL show average request duration.
4. WHEN `http_req_duration` includes `p(95)`, THE System SHALL show p95 request duration.
5. WHEN `http_req_duration` includes `p(99)`, THE System SHALL show p99 request duration.
6. WHEN `http_req_waiting` or `waiting_time` is available, THE System SHALL show average waiting time.
7. WHEN `iterations` is available, THE System SHALL show iteration count.
8. WHEN `checks` is available, THE System SHALL show check result summary.
9. WHEN `retries` is available, THE System SHALL show retry count.
10. WHEN a KPI Metric is unavailable, THE System SHALL show `N/A` instead of failing rendering.

### Requirement 3: Resultados de thresholds

**User Story:** As a tester, I want threshold results to be visible, so that failed criteria are obvious.

#### Acceptance Criteria

1. WHEN Threshold data is present in metrics, THE System SHALL render a threshold status section.
2. WHEN a Threshold passed, THE System SHALL display it with a pass state.
3. WHEN a Threshold failed, THE System SHALL display it with a fail state.
4. WHEN Threshold data is absent, THE System SHALL hide the threshold table and show a neutral unavailable state.
5. WHEN Thresholds are grouped by Metric, THE System SHALL preserve the metric name in the display.

### Requirement 4: Gráficos de métricas

**User Story:** As a tester, I want charts for important metrics, so that I can compare result dimensions visually.

#### Acceptance Criteria

1. WHEN normalized duration metrics are available, THE System SHALL render a duration chart.
2. WHEN failed request rate is available, THE System SHALL render a failure chart or visual indicator.
3. WHEN request and iteration counts are available, THE System SHALL render count comparisons.
4. WHEN custom metrics are available, THE System SHALL include supported custom metrics in charts or metric tables.
5. WHEN only aggregate summary data is available, THE System SHALL render aggregate charts instead of time-series charts.

### Requirement 5: Identificación de contexto de prueba

**User Story:** As a tester, I want the dashboard to identify test context, so that reports are easy to classify.

#### Acceptance Criteria

1. WHEN the uploaded filename contains `loadtest`, THE System SHALL identify the report as load test.
2. WHEN the uploaded filename contains `stresstest`, THE System SHALL identify the report as stress test.
3. WHEN the uploaded filename contains `capacitytest`, THE System SHALL identify the report as capacity test.
4. WHEN the uploaded filename contains `stabilitytest`, THE System SHALL identify the report as stability test.
5. WHEN the test type cannot be inferred, THE System SHALL show the test type as unknown.

### Requirement 6: Exportación de reporte HTML

**User Story:** As a tester, I want to export an HTML report, so that I can share results without sending the original app state.

#### Acceptance Criteria

1. WHEN a valid report is rendered, THE System SHALL enable HTML_Report export.
2. WHEN the user exports HTML, THE System SHALL generate a standalone HTML_Report file.
3. WHEN the standalone HTML_Report file is opened, THE System SHALL display the imported report without requiring the original K6_Summary_JSON file.
4. WHEN no valid report is loaded, THE System SHALL disable or block HTML_Report export.

### Requirement 7: Procesamiento exclusivamente local

**User Story:** As a tester, I want all processing to stay local, so that performance data is not uploaded externally.

#### Acceptance Criteria

1. WHEN a K6_Summary_JSON file is imported, THE System SHALL process it in the browser.
2. THE System SHALL NOT send performance data to external services.
3. WHEN a report is exported, THE System SHALL generate it locally in the browser.
