/**
 * Servicio para extraer resultados de thresholds de métricas K6
 * 
 * Este servicio itera sobre las métricas del resumen de K6, busca la propiedad
 * `thresholds` en cada métrica, y mapea los resultados a la interfaz ThresholdResult.
 * 
 * Estructura esperada de K6:
 * ```
 * metrics: {
 *   http_req_duration: {
 *     thresholds: {
 *       "p(95) < 2000": { ok: true },
 *       "p(99) < 3000": { ok: false }
 *     }
 *   }
 * }
 * ```
 * 
 * Validates: Requirements 3.1-3.5
 */

import { ThresholdResult } from "../models/report";

/**
 * Extrae los resultados de thresholds de las métricas K6.
 * 
 * Itera sobre cada métrica buscando la propiedad `thresholds`.
 * Para cada threshold encontrado, extrae:
 * - Nombre de la métrica (clave del objeto metrics)
 * - Expresión del threshold (clave del objeto thresholds)
 * - Estado del threshold (mapea ok: true/false a passed: true/false)
 * 
 * @param metrics - Objeto de métricas del resumen K6
 * @returns Array de ThresholdResult. Array vacío si no hay thresholds.
 * 
 * @example
 * ```typescript
 * const metrics = {
 *   http_req_duration: {
 *     thresholds: {
 *       "p(95) < 500": { ok: true },
 *       "p(99) < 1000": { ok: false }
 *     }
 *   }
 * };
 * 
 * const results = extractThresholds(metrics);
 * // [
 * //   { metric: "http_req_duration", expression: "p(95) < 500", passed: true },
 * //   { metric: "http_req_duration", expression: "p(99) < 1000", passed: false }
 * // ]
 * ```
 */
export function extractThresholds(metrics: Record<string, unknown>): ThresholdResult[] {
  const results: ThresholdResult[] = [];

  // Iterar sobre cada métrica
  for (const [metricName, metricData] of Object.entries(metrics)) {
    // Verificar que metricData es un objeto y tiene la propiedad thresholds
    if (
      metricData &&
      typeof metricData === "object" &&
      "thresholds" in metricData &&
      metricData.thresholds &&
      typeof metricData.thresholds === "object"
    ) {
      const thresholds = metricData.thresholds as Record<string, unknown>;

      // Iterar sobre cada threshold en la métrica
      for (const [expression, thresholdData] of Object.entries(thresholds)) {
        // Verificar que thresholdData es un objeto con propiedad 'ok'
        if (
          thresholdData &&
          typeof thresholdData === "object" &&
          "ok" in thresholdData
        ) {
          const okValue = (thresholdData as { ok: unknown }).ok;

          // Mapear ok: true a passed: true, ok: false a passed: false
          const passed = okValue === true;

          results.push({
            metric: metricName,
            expression: expression,
            passed: passed,
          });
        }
      }
    }
  }

  return results;
}
