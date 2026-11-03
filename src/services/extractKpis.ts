/**
 * Servicio de extracción de KPIs desde métricas K6
 * 
 * Este módulo se encarga de recorrer la tabla de mapeo de métricas,
 * navegar las rutas de acceso de forma segura, aplicar fallbacks cuando
 * sea necesario, y formatear valores con sus unidades apropiadas.
 */

import { METRIC_MAPPINGS } from "../models/metrics";
import { Kpi, KpiStatus } from "../models/report";

/**
 * Navega de forma segura una ruta en un objeto anidado
 * 
 * @param obj - Objeto en el que buscar
 * @param path - Ruta separada por puntos (e.g., 'http_reqs.values.count')
 * @returns El valor encontrado o undefined si no existe
 * 
 * @example
 * const obj = { http_reqs: { values: { count: 1234 } } };
 * getNestedValue(obj, 'http_reqs.values.count'); // 1234
 * getNestedValue(obj, 'missing.path'); // undefined
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    // Verificar que current es un objeto antes de acceder a propiedades
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];

    // Si en algún punto no existe el valor, retornar undefined
    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Formatea un valor numérico según su unidad
 * 
 * @param value - Valor numérico a formatear
 * @param unit - Unidad de medida ('ms', '%', 'count', etc.)
 * @returns String formateado con el valor
 * 
 * @example
 * formatValue(1234.567, 'ms'); // '1,234.57'
 * formatValue(0.856, '%'); // '85.60'
 * formatValue(5000, 'count'); // '5,000'
 */
function formatValue(value: number, unit: string): string {
  // Convertir porcentaje (0-1) a formato legible (0-100)
  if (unit === "%") {
    return (value * 100).toFixed(2);
  }

  // Para tiempos en ms, mostrar 2 decimales
  if (unit === "ms") {
    return value.toFixed(2);
  }

  // Para conteos, mostrar número entero con separadores de miles
  if (unit === "count") {
    return Math.round(value).toLocaleString("en-US");
  }

  // Para cualquier otro caso, mostrar con 2 decimales
  return value.toFixed(2);
}

/**
 * Determina el estado visual de un KPI basado en su valor y tipo
 * 
 * Por ahora, todos los KPIs tienen estado "normal".
 * En futuras versiones se podría implementar lógica de umbrales.
 * 
 * @param _value - Valor del KPI (no usado por ahora)
 * @param _unit - Unidad del KPI (no usado por ahora)
 * @returns Estado visual del KPI
 */
function determineStatus(_value: string, _unit: string): KpiStatus {
  // Por ahora, todos los KPIs tienen estado normal
  // En el futuro se puede implementar lógica de umbrales aquí
  return "normal";
}

/**
 * Extrae KPIs del objeto de métricas K6
 * 
 * Recorre la tabla de mapeo de métricas METRIC_MAPPINGS, intenta extraer
 * cada valor usando la ruta primaria, aplica fallback si está definido,
 * y retorna "N/A" si ninguna ruta produce un valor.
 * 
 * @param metrics - Objeto de métricas del summary JSON de K6
 * @returns Array de KPIs extraídos y formateados
 * 
 * @example
 * const metrics = {
 *   http_reqs: { values: { count: 1234 } },
 *   http_req_duration: { values: { avg: 125.5, 'p(95)': 200 } }
 * };
 * const kpis = extractKpis(metrics);
 * // [
 * //   { key: 'http_reqs', label: 'Total requests', value: '1,234', unit: 'count', status: 'normal' },
 * //   { key: 'http_req_duration_avg', label: 'Avg duration', value: '125.50', unit: 'ms', status: 'normal' },
 * //   ...
 * // ]
 */
export function extractKpis(metrics: Record<string, unknown>): Kpi[] {
  const kpis: Kpi[] = [];

  // Recorrer cada mapeo de la tabla
  for (const mapping of METRIC_MAPPINGS) {
    let rawValue: unknown = undefined;

    // Intentar extraer el valor de la ruta primaria
    rawValue = getNestedValue(metrics, mapping.path.primary);

    // Si no se encontró y existe fallback, intentar con el fallback
    if (rawValue === undefined && mapping.path.fallback) {
      rawValue = getNestedValue(metrics, mapping.path.fallback);
    }

    // Formatear el valor o usar "N/A"
    let formattedValue: string;
    if (rawValue === undefined || rawValue === null) {
      formattedValue = "N/A";
    } else if (typeof rawValue === "number") {
      formattedValue = formatValue(rawValue, mapping.unit);
    } else {
      // Si el valor no es un número válido, usar "N/A"
      formattedValue = "N/A";
    }

    // Determinar el estado visual
    const status = determineStatus(formattedValue, mapping.unit);

    // Construir el KPI
    kpis.push({
      key: mapping.key,
      label: mapping.dashboardField,
      value: formattedValue,
      unit: mapping.unit,
      status
    });
  }

  return kpis;
}
