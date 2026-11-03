/**
 * Configuración y mapeo de métricas K6 para el dashboard
 */

/**
 * Tipo para el JSON raw de K6 summary
 * Debe contener al menos un objeto 'metrics'
 */
export type RawSummary = {
  metrics: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Definición de una ruta de métrica con fallback opcional
 */
interface MetricPath {
  primary: string;      // Ruta principal (e.g., 'http_reqs.values.count')
  fallback?: string;    // Ruta alternativa si la principal no existe
}

/**
 * Definición de un mapeo de métrica del dashboard
 */
interface MetricMapping {
  dashboardField: string;   // Campo del dashboard (e.g., 'Total requests')
  path: MetricPath;         // Configuración de rutas
  unit: string;             // Unidad de medida
  key: string;              // Clave interna del KPI
}

/**
 * Tabla de mapeo de métricas K6 al dashboard
 * Define cómo extraer cada KPI del objeto metrics de K6
 */
export const METRIC_MAPPINGS: readonly MetricMapping[] = [
  {
    dashboardField: "Total requests",
    path: {
      primary: "http_reqs.values.count",
      fallback: "Total_Reqs.values.count"
    },
    unit: "count",
    key: "http_reqs"
  },
  {
    dashboardField: "Failed request rate",
    path: {
      primary: "http_req_failed.values.rate"
    },
    unit: "%",
    key: "http_req_failed"
  },
  {
    dashboardField: "Avg duration",
    path: {
      primary: "http_req_duration.values.avg"
    },
    unit: "ms",
    key: "http_req_duration_avg"
  },
  {
    dashboardField: "P95 duration",
    path: {
      primary: "http_req_duration.values.p(95)"
    },
    unit: "ms",
    key: "http_req_duration_p95"
  },
  {
    dashboardField: "P99 duration",
    path: {
      primary: "http_req_duration.values.p(99)"
    },
    unit: "ms",
    key: "http_req_duration_p99"
  },
  {
    dashboardField: "Avg waiting time",
    path: {
      primary: "http_req_waiting.values.avg",
      fallback: "waiting_time.values.avg"
    },
    unit: "ms",
    key: "http_req_waiting"
  },
  {
    dashboardField: "Iterations",
    path: {
      primary: "iterations.values.count"
    },
    unit: "count",
    key: "iterations"
  },
  {
    dashboardField: "Checks",
    path: {
      primary: "checks.values.rate"
    },
    unit: "%",
    key: "checks"
  },
  {
    dashboardField: "Retries",
    path: {
      primary: "retries.values.count"
    },
    unit: "count",
    key: "retries"
  }
] as const;
