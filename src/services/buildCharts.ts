/**
 * Servicio de construcción de series de gráficos desde métricas K6
 * 
 * Responsabilidades:
 * - Extraer valores de métricas de duración (avg, p95, p99)
 * - Extraer valores de fallos y conteos
 * - Identificar y agregar métricas custom soportadas
 * - Retornar series estructuradas para renderizado de gráficos
 */

import { ChartSeries } from "../models/report";

/**
 * Helper para navegar de forma segura por rutas anidadas en objetos
 * 
 * @param obj - Objeto donde buscar
 * @param path - Ruta en formato punto (e.g., 'http_req_duration.values.avg')
 * @returns El valor encontrado o undefined
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

/**
 * Extrae un valor numérico de forma segura desde una ruta
 * 
 * @param metrics - Objeto de métricas
 * @param path - Ruta de acceso
 * @returns Número o undefined si no existe o no es numérico
 */
function getNumericValue(metrics: Record<string, unknown>, path: string): number | undefined {
  const value = getValueByPath(metrics, path);
  
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  return undefined;
}

/**
 * Construye las series de datos para gráficos a partir de las métricas K6
 * 
 * Genera series para:
 * - Duración de requests (avg, p95, p99)
 * - Tasa de fallos
 * - Conteos (requests totales e iteraciones)
 * - Métricas custom soportadas
 * 
 * @param metrics - Objeto de métricas del K6 summary
 * @returns Array de series de gráficos con valores normalizados
 * 
 * @example
 * ```typescript
 * const charts = buildCharts(rawSummary.metrics);
 * // charts contiene series para renderizar en ChartPanel
 * ```
 */
export function buildCharts(metrics: Record<string, unknown>): ChartSeries[] {
  const series: ChartSeries[] = [];

  // Serie 1: Duración de requests (avg, p95, p99)
  const durationValues: number[] = [];
  const durationLabels: string[] = [];
  
  const avgDuration = getNumericValue(metrics, "http_req_duration.values.avg");
  if (avgDuration !== undefined) {
    durationValues.push(avgDuration);
    durationLabels.push("Avg");
  }
  
  const p95Duration = getNumericValue(metrics, "http_req_duration.values.p(95)");
  if (p95Duration !== undefined) {
    durationValues.push(p95Duration);
    durationLabels.push("P95");
  }
  
  const p99Duration = getNumericValue(metrics, "http_req_duration.values.p(99)");
  if (p99Duration !== undefined) {
    durationValues.push(p99Duration);
    durationLabels.push("P99");
  }
  
  if (durationValues.length > 0) {
    series.push({
      key: "http_req_duration",
      label: `Request Duration (ms) [${durationLabels.join(", ")}]`,
      values: durationValues
    });
  }

  // Serie 2: Tasa de fallos
  const failedRate = getNumericValue(metrics, "http_req_failed.values.rate");
  if (failedRate !== undefined) {
    // Convertir rate a porcentaje (K6 devuelve valores entre 0 y 1)
    const failedPercentage = failedRate * 100;
    series.push({
      key: "http_req_failed",
      label: "Failed Request Rate (%)",
      values: [failedPercentage]
    });
  }

  // Serie 3: Conteos (requests e iteraciones)
  const countValues: number[] = [];
  const countLabels: string[] = [];
  
  const httpReqs = getNumericValue(metrics, "http_reqs.values.count");
  if (httpReqs !== undefined) {
    countValues.push(httpReqs);
    countLabels.push("Requests");
  }
  
  const iterations = getNumericValue(metrics, "iterations.values.count");
  if (iterations !== undefined) {
    countValues.push(iterations);
    countLabels.push("Iterations");
  }
  
  if (countValues.length > 0) {
    series.push({
      key: "counts",
      label: `Total Counts [${countLabels.join(", ")}]`,
      values: countValues
    });
  }

  // Serie 4: Métricas custom soportadas
  // Identificar métricas custom que tengan estructura values.{avg|count|rate}
  const customMetrics = findCustomMetrics(metrics);
  
  for (const customMetric of customMetrics) {
    const customValues: number[] = [];
    const customLabels: string[] = [];
    
    // Intentar extraer valores comunes de métricas custom
    const customAvg = getNumericValue(metrics, `${customMetric}.values.avg`);
    if (customAvg !== undefined) {
      customValues.push(customAvg);
      customLabels.push("Avg");
    }
    
    const customCount = getNumericValue(metrics, `${customMetric}.values.count`);
    if (customCount !== undefined) {
      customValues.push(customCount);
      customLabels.push("Count");
    }
    
    const customRate = getNumericValue(metrics, `${customMetric}.values.rate`);
    if (customRate !== undefined) {
      // Convertir rate a porcentaje
      customValues.push(customRate * 100);
      customLabels.push("Rate (%)");
    }
    
    if (customValues.length > 0) {
      series.push({
        key: customMetric,
        label: `${customMetric} [${customLabels.join(", ")}]`,
        values: customValues
      });
    }
  }

  return series;
}

/**
 * Identifica métricas custom en el objeto metrics
 * 
 * Métricas custom son aquellas que:
 * - No son métricas estándar de K6
 * - Tienen estructura con propiedad 'values'
 * 
 * @param metrics - Objeto de métricas
 * @returns Array de nombres de métricas custom
 */
function findCustomMetrics(metrics: Record<string, unknown>): string[] {
  const standardMetrics = new Set([
    "http_reqs",
    "http_req_failed",
    "http_req_duration",
    "http_req_waiting",
    "http_req_blocked",
    "http_req_connecting",
    "http_req_receiving",
    "http_req_sending",
    "http_req_tls_handshaking",
    "iterations",
    "iteration_duration",
    "checks",
    "data_received",
    "data_sent",
    "vus",
    "vus_max",
    "retries",
    "Total_Reqs",
    "waiting_time"
  ]);

  const customMetrics: string[] = [];

  for (const [metricName, metricValue] of Object.entries(metrics)) {
    // Saltar métricas estándar
    if (standardMetrics.has(metricName)) {
      continue;
    }

    // Verificar que la métrica tenga estructura válida (con 'values')
    if (
      typeof metricValue === 'object' && 
      metricValue !== null && 
      'values' in metricValue &&
      typeof (metricValue as Record<string, unknown>).values === 'object'
    ) {
      customMetrics.push(metricName);
    }
  }

  return customMetrics;
}
