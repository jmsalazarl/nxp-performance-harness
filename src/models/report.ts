/**
 * Modelo de datos para el dashboard de rendimiento K6
 */

/**
 * Tipo de prueba de rendimiento
 */
export type TestType = "loadtest" | "stresstest" | "capacitytest" | "stabilitytest" | "unknown";

/**
 * Estado visual de un KPI
 */
export type KpiStatus = "normal" | "warning" | "critical";

/**
 * Indicador clave de rendimiento (KPI)
 */
export interface Kpi {
  key: string;          // Identificador interno de la métrica (e.g., 'http_reqs')
  label: string;        // Etiqueta legible para el usuario (e.g., 'Total Requests')
  value: string;        // Valor formateado como string (e.g., '1,234') o 'N/A' si no disponible
  unit: string;         // Unidad de medida ('ms', 'req/s', '%', 'count')
  status: KpiStatus;    // Estado visual (normal, warning, critical)
}

/**
 * Resultado de un threshold de K6
 */
export interface ThresholdResult {
  metric: string;       // Nombre de la métrica asociada (e.g., 'http_req_duration')
  expression: string;   // Expresión del threshold (e.g., 'p(95)<500')
  passed: boolean;      // Indica si el threshold fue cumplido
}

/**
 * Serie de datos para gráficos
 */
export interface ChartSeries {
  key: string;          // Identificador de la serie
  label: string;        // Etiqueta para leyenda del gráfico
  values: number[];     // Valores numéricos de la serie
}

/**
 * Modelo principal del reporte de rendimiento
 */
export interface ReportModel {
  fileName: string;                         // Nombre original del archivo subido
  testType: TestType;                       // Tipo de prueba inferido
  kpis: Kpi[];                              // Lista de indicadores clave extraídos
  thresholds: ThresholdResult[];            // Lista de resultados de thresholds (vacía si no hay datos)
  charts: ChartSeries[];                    // Series de datos para renderizar gráficos
  rawSummary: Record<string, unknown>;      // Objeto JSON original para referencia
}
