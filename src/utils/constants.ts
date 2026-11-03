/**
 * Constantes y tipos utilitarios para el Config Builder UI
 * 
 * Este módulo define:
 * - Límites de colección (endpoints, stages, expresiones)
 * - Métricas K6 sugeridas
 * - Métodos HTTP permitidos
 * - Regex de validación para duraciones K6
 * - Rangos de valores numéricos
 * 
 * Requirements: 2.1, 4.2, 5.1, 5.2
 */

// ============================================================================
// LÍMITES DE COLECCIÓN
// ============================================================================

/**
 * Número máximo de endpoints permitidos en una configuración
 * @requirement 2.1
 */
export const MAX_ENDPOINTS = 50;

/**
 * Número máximo de stages permitidos por perfil
 * @requirement 4.2
 */
export const MAX_STAGES = 20;

/**
 * Número máximo de expresiones de threshold permitidas por métrica
 * @requirement 5.2
 */
export const MAX_EXPRESSIONS = 10;

// ============================================================================
// MÉTODOS HTTP
// ============================================================================

/**
 * Métodos HTTP permitidos para endpoints
 * @requirement 3.2
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/**
 * Tipo para métodos HTTP permitidos
 */
export type HttpMethod = typeof HTTP_METHODS[number];

// ============================================================================
// TIPOS DE PERFIL
// ============================================================================

/**
 * Tipos de perfil de prueba soportados
 * @requirement 4.1
 */
export const PROFILE_TYPES = [
  'loadtest',
  'stresstest',
  'capacitytest',
  'stabilitytest',
] as const;

/**
 * Tipo para perfiles de prueba
 */
export type ProfileType = typeof PROFILE_TYPES[number];

// ============================================================================
// MÉTRICAS K6
// ============================================================================

/**
 * Lista de métricas K6 estándar sugeridas para thresholds
 * @requirement 5.1
 */
export const K6_METRICS = [
  'http_req_duration',
  'http_req_failed',
  'http_reqs',
  'http_req_waiting',
  'http_req_blocked',
  'http_req_connecting',
  'http_req_receiving',
  'http_req_tls_handshaking',
  'http_req_sending',
  'iteration_duration',
  'iterations',
] as const;

/**
 * Tipo para métricas K6 estándar
 */
export type K6Metric = typeof K6_METRICS[number];

// ============================================================================
// VALIDACIÓN DE DURACIONES K6
// ============================================================================

/**
 * Regex para validar formato de duración K6
 * Formatos válidos: "30s", "2m", "1h", "500ms", "1h30m", etc.
 * @requirement 4.3, 4.4
 */
export const K6_DURATION_REGEX = /^(\d+(\.\d+)?(ms|s|m|h))+$/;

/**
 * Valida si una cadena tiene el formato de duración K6
 * @param duration - Cadena de duración a validar
 * @returns true si es un formato válido, false en caso contrario
 */
export function isValidK6Duration(duration: string): boolean {
  return K6_DURATION_REGEX.test(duration.trim());
}

// ============================================================================
// VALIDACIÓN DE NOMBRES DE MÉTRICA
// ============================================================================

/**
 * Regex para validar nombres de métricas personalizadas
 * Permite: letras, dígitos y guiones bajos
 * Longitud: 1-128 caracteres
 * @requirement 5.3
 */
export const METRIC_NAME_REGEX = /^[a-zA-Z0-9_]{1,128}$/;

/**
 * Valida si un nombre de métrica personalizada es válido
 * @param name - Nombre de la métrica a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidMetricName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && METRIC_NAME_REGEX.test(trimmed);
}

// ============================================================================
// RANGOS DE VALORES NUMÉRICOS
// ============================================================================

/**
 * Rango válido para el código de estado HTTP esperado
 * @requirement 3.1
 */
export const EXPECTED_STATUS_RANGE = {
  min: 100,
  max: 599,
} as const;

/**
 * Rango válido para el número máximo de reintentos
 * @requirement 3.1
 */
export const MAX_RETRIES_RANGE = {
  min: 0,
  max: 10,
} as const;

/**
 * Rango válido para el tiempo de espera (think time) en segundos
 * @requirement 3.1
 */
export const THINK_TIME_RANGE = {
  min: 0,
  max: 60,
} as const;

/**
 * Rango válido para el target de usuarios virtuales en un stage
 * @requirement 4.3
 */
export const STAGE_TARGET_RANGE = {
  min: 0,
  max: 10000,
} as const;

// ============================================================================
// VALIDACIÓN DE URL
// ============================================================================

/**
 * Prefijos válidos para URLs
 * @requirement 3.7
 */
export const VALID_URL_PREFIXES = ['http://', 'https://'] as const;

/**
 * Valida si una URL tiene un prefijo válido
 * @param url - URL a validar
 * @returns true si tiene prefijo válido, false en caso contrario
 */
export function hasValidUrlPrefix(url: string): boolean {
  const trimmed = url.trim();
  return VALID_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

// ============================================================================
// DEBOUNCE DE VALIDACIÓN
// ============================================================================

/**
 * Tiempo de debounce en milisegundos para validación de campos
 * @requirement 3.6
 */
export const VALIDATION_DEBOUNCE_MS = 500;

// ============================================================================
// VALORES POR DEFECTO
// ============================================================================

/**
 * Valores por defecto para nuevo endpoint
 * @requirement 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8
 */
export const DEFAULT_ENDPOINT_VALUES = {
  method: 'POST' as HttpMethod,
  headers: { 'Content-Type': 'application/json' },
  headersText: '{ "Content-Type": "application/json" }',
  payload: {},
  payloadText: '{}',
  expectedStatus: 200,
  maxRetries: 3,
  thinkTimeSeconds: 1,
  url: '',
} as const;

/**
 * Valores por defecto para nuevo stage
 * @requirement 7.7
 */
export const DEFAULT_STAGE_VALUES = {
  duration: '30s',
  target: 1,
} as const;

// ============================================================================
// MENSAJES DE ERROR
// ============================================================================

/**
 * Mensajes de error estandarizados para validación
 */
export const VALIDATION_ERRORS = {
  URL_EMPTY: 'La URL no puede estar vacía',
  URL_INVALID_PREFIX: 'La URL debe comenzar con http:// o https://',
  METHOD_INVALID: `El método debe ser uno de: ${HTTP_METHODS.join(', ')}`,
  EXPECTED_STATUS_OUT_OF_RANGE: `El estado esperado debe estar entre ${EXPECTED_STATUS_RANGE.min} y ${EXPECTED_STATUS_RANGE.max}`,
  MAX_RETRIES_OUT_OF_RANGE: `Los reintentos máximos deben estar entre ${MAX_RETRIES_RANGE.min} y ${MAX_RETRIES_RANGE.max}`,
  THINK_TIME_OUT_OF_RANGE: `El tiempo de espera debe estar entre ${THINK_TIME_RANGE.min} y ${THINK_TIME_RANGE.max} segundos`,
  STAGE_TARGET_OUT_OF_RANGE: `El target debe estar entre ${STAGE_TARGET_RANGE.min} y ${STAGE_TARGET_RANGE.max}`,
  DURATION_INVALID_FORMAT: 'La duración debe tener formato K6 válido (ej: "30s", "2m", "1h")',
  HEADERS_NOT_OBJECT: 'Los headers deben ser un objeto JSON válido (no array ni primitivo)',
  PAYLOAD_INVALID_JSON: 'El payload debe ser JSON válido',
  JSON_PARSE_ERROR: 'Error al parsear JSON',
  METRIC_NAME_INVALID: 'El nombre de la métrica debe contener solo letras, dígitos y guiones bajos (1-128 caracteres)',
  THRESHOLD_EXPRESSION_EMPTY: 'La expresión de threshold no puede estar vacía',
  MAX_ENDPOINTS_REACHED: `No se pueden agregar más de ${MAX_ENDPOINTS} endpoints`,
  MAX_STAGES_REACHED: `No se pueden agregar más de ${MAX_STAGES} stages por perfil`,
  MAX_EXPRESSIONS_REACHED: `No se pueden agregar más de ${MAX_EXPRESSIONS} expresiones por métrica`,
  NO_ENDPOINTS: 'Se requiere al menos un endpoint para exportar',
  NO_PROFILES_ENABLED: 'Al menos un perfil debe estar habilitado',
  PROFILE_NO_STAGES: 'El perfil habilitado debe tener al menos un stage',
  METRIC_NO_EXPRESSIONS: 'La métrica debe tener al menos una expresión',
  REQUIRED_FIELD: 'Este campo es requerido',
} as const;
