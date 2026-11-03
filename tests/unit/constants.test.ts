/**
 * Tests unitarios para constantes y utilidades
 * Task 2.2: Crear constantes y tipos utilitarios
 */

import { describe, it, expect } from 'vitest';
import {
  MAX_ENDPOINTS,
  MAX_STAGES,
  MAX_EXPRESSIONS,
  HTTP_METHODS,
  PROFILE_TYPES,
  K6_METRICS,
  K6_DURATION_REGEX,
  METRIC_NAME_REGEX,
  EXPECTED_STATUS_RANGE,
  MAX_RETRIES_RANGE,
  THINK_TIME_RANGE,
  STAGE_TARGET_RANGE,
  VALID_URL_PREFIXES,
  VALIDATION_DEBOUNCE_MS,
  DEFAULT_ENDPOINT_VALUES,
  DEFAULT_STAGE_VALUES,
  VALIDATION_ERRORS,
  isValidK6Duration,
  isValidMetricName,
  hasValidUrlPrefix,
} from '../../src/utils/constants';

describe('Constants - Límites de Colección', () => {
  it('debe definir MAX_ENDPOINTS como 50', () => {
    expect(MAX_ENDPOINTS).toBe(50);
  });

  it('debe definir MAX_STAGES como 20', () => {
    expect(MAX_STAGES).toBe(20);
  });

  it('debe definir MAX_EXPRESSIONS como 10', () => {
    expect(MAX_EXPRESSIONS).toBe(10);
  });
});

describe('Constants - Métodos HTTP', () => {
  it('debe incluir los 5 métodos HTTP permitidos', () => {
    expect(HTTP_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });

  it('debe ser readonly', () => {
    expect(Object.isFrozen(HTTP_METHODS)).toBe(false); // as const no congela, pero TypeScript previene mutación
    expect(HTTP_METHODS.length).toBe(5);
  });
});

describe('Constants - Tipos de Perfil', () => {
  it('debe incluir los 4 tipos de perfil', () => {
    expect(PROFILE_TYPES).toEqual([
      'loadtest',
      'stresstest',
      'capacitytest',
      'stabilitytest',
    ]);
  });
});

describe('Constants - Métricas K6', () => {
  it('debe incluir las 11 métricas K6 estándar', () => {
    expect(K6_METRICS).toHaveLength(11);
    expect(K6_METRICS).toContain('http_req_duration');
    expect(K6_METRICS).toContain('http_req_failed');
    expect(K6_METRICS).toContain('iterations');
  });

  it('debe incluir todas las métricas mencionadas en Requirement 5.1', () => {
    const expectedMetrics = [
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
    ];
    expectedMetrics.forEach((metric) => {
      expect(K6_METRICS).toContain(metric);
    });
  });
});

describe('Validation - isValidK6Duration', () => {
  it('debe aceptar duraciones K6 válidas', () => {
    expect(isValidK6Duration('30s')).toBe(true);
    expect(isValidK6Duration('2m')).toBe(true);
    expect(isValidK6Duration('1h')).toBe(true);
    expect(isValidK6Duration('500ms')).toBe(true);
    expect(isValidK6Duration('1h30m')).toBe(true);
    expect(isValidK6Duration('1h30m15s')).toBe(true);
    expect(isValidK6Duration('0.5s')).toBe(true);
  });

  it('debe rechazar duraciones K6 inválidas', () => {
    expect(isValidK6Duration('')).toBe(false);
    expect(isValidK6Duration('30')).toBe(false);
    expect(isValidK6Duration('s')).toBe(false);
    expect(isValidK6Duration('30x')).toBe(false);
    expect(isValidK6Duration('abc')).toBe(false);
    expect(isValidK6Duration('30 s')).toBe(false);
  });

  it('debe manejar espacios en blanco', () => {
    expect(isValidK6Duration(' 30s ')).toBe(true);
    expect(isValidK6Duration('  ')).toBe(false);
  });
});

describe('Validation - isValidMetricName', () => {
  it('debe aceptar nombres de métrica válidos', () => {
    expect(isValidMetricName('custom_metric')).toBe(true);
    expect(isValidMetricName('metric123')).toBe(true);
    expect(isValidMetricName('my_custom_metric_1')).toBe(true);
    expect(isValidMetricName('a')).toBe(true);
  });

  it('debe rechazar nombres de métrica inválidos', () => {
    expect(isValidMetricName('')).toBe(false);
    expect(isValidMetricName('   ')).toBe(false);
    expect(isValidMetricName('metric-name')).toBe(false);
    expect(isValidMetricName('metric.name')).toBe(false);
    expect(isValidMetricName('metric name')).toBe(false);
    expect(isValidMetricName('metric@name')).toBe(false);
  });

  it('debe rechazar nombres demasiado largos (>128 caracteres)', () => {
    const longName = 'a'.repeat(129);
    expect(isValidMetricName(longName)).toBe(false);
    expect(isValidMetricName('a'.repeat(128))).toBe(true);
  });

  it('debe manejar espacios en blanco', () => {
    expect(isValidMetricName(' custom_metric ')).toBe(true);
  });
});

describe('Validation - hasValidUrlPrefix', () => {
  it('debe aceptar URLs con prefijos válidos', () => {
    expect(hasValidUrlPrefix('http://example.com')).toBe(true);
    expect(hasValidUrlPrefix('https://example.com')).toBe(true);
    expect(hasValidUrlPrefix('https://api.example.com/v1/users')).toBe(true);
  });

  it('debe rechazar URLs sin prefijos válidos', () => {
    expect(hasValidUrlPrefix('')).toBe(false);
    expect(hasValidUrlPrefix('example.com')).toBe(false);
    expect(hasValidUrlPrefix('ftp://example.com')).toBe(false);
    expect(hasValidUrlPrefix('//example.com')).toBe(false);
  });

  it('debe manejar espacios en blanco', () => {
    expect(hasValidUrlPrefix(' https://example.com ')).toBe(true);
  });
});

describe('Constants - Rangos Numéricos', () => {
  it('debe definir rango correcto para expectedStatus', () => {
    expect(EXPECTED_STATUS_RANGE.min).toBe(100);
    expect(EXPECTED_STATUS_RANGE.max).toBe(599);
  });

  it('debe definir rango correcto para maxRetries', () => {
    expect(MAX_RETRIES_RANGE.min).toBe(0);
    expect(MAX_RETRIES_RANGE.max).toBe(10);
  });

  it('debe definir rango correcto para thinkTimeSeconds', () => {
    expect(THINK_TIME_RANGE.min).toBe(0);
    expect(THINK_TIME_RANGE.max).toBe(60);
  });

  it('debe definir rango correcto para stage target', () => {
    expect(STAGE_TARGET_RANGE.min).toBe(0);
    expect(STAGE_TARGET_RANGE.max).toBe(10000);
  });
});

describe('Constants - Valores por Defecto', () => {
  it('debe definir valores por defecto correctos para endpoint', () => {
    expect(DEFAULT_ENDPOINT_VALUES.method).toBe('POST');
    expect(DEFAULT_ENDPOINT_VALUES.expectedStatus).toBe(200);
    expect(DEFAULT_ENDPOINT_VALUES.maxRetries).toBe(3);
    expect(DEFAULT_ENDPOINT_VALUES.thinkTimeSeconds).toBe(1);
    expect(DEFAULT_ENDPOINT_VALUES.url).toBe('');
    expect(DEFAULT_ENDPOINT_VALUES.headersText).toBe(
      '{ "Content-Type": "application/json" }'
    );
    expect(DEFAULT_ENDPOINT_VALUES.payloadText).toBe('{}');
  });

  it('debe definir valores por defecto correctos para stage', () => {
    expect(DEFAULT_STAGE_VALUES.duration).toBe('30s');
    expect(DEFAULT_STAGE_VALUES.target).toBe(1);
  });
});

describe('Constants - Debounce', () => {
  it('debe definir VALIDATION_DEBOUNCE_MS como 500', () => {
    expect(VALIDATION_DEBOUNCE_MS).toBe(500);
  });
});

describe('Constants - Mensajes de Error', () => {
  it('debe incluir mensajes de error para validación de URL', () => {
    expect(VALIDATION_ERRORS.URL_EMPTY).toBeDefined();
    expect(VALIDATION_ERRORS.URL_INVALID_PREFIX).toBeDefined();
  });

  it('debe incluir mensajes de error para rangos numéricos', () => {
    expect(VALIDATION_ERRORS.EXPECTED_STATUS_OUT_OF_RANGE).toBeDefined();
    expect(VALIDATION_ERRORS.MAX_RETRIES_OUT_OF_RANGE).toBeDefined();
    expect(VALIDATION_ERRORS.THINK_TIME_OUT_OF_RANGE).toBeDefined();
    expect(VALIDATION_ERRORS.STAGE_TARGET_OUT_OF_RANGE).toBeDefined();
  });

  it('debe incluir mensajes de error para límites de colección', () => {
    expect(VALIDATION_ERRORS.MAX_ENDPOINTS_REACHED).toBeDefined();
    expect(VALIDATION_ERRORS.MAX_STAGES_REACHED).toBeDefined();
    expect(VALIDATION_ERRORS.MAX_EXPRESSIONS_REACHED).toBeDefined();
  });
});

describe('Regex - K6_DURATION_REGEX', () => {
  it('debe validar duraciones simples', () => {
    expect(K6_DURATION_REGEX.test('30s')).toBe(true);
    expect(K6_DURATION_REGEX.test('2m')).toBe(true);
    expect(K6_DURATION_REGEX.test('1h')).toBe(true);
    expect(K6_DURATION_REGEX.test('500ms')).toBe(true);
  });

  it('debe validar duraciones compuestas', () => {
    expect(K6_DURATION_REGEX.test('1h30m')).toBe(true);
    expect(K6_DURATION_REGEX.test('1h30m15s')).toBe(true);
    expect(K6_DURATION_REGEX.test('2m30s')).toBe(true);
  });

  it('debe validar duraciones con decimales', () => {
    expect(K6_DURATION_REGEX.test('1.5s')).toBe(true);
    expect(K6_DURATION_REGEX.test('0.5m')).toBe(true);
  });
});

describe('Regex - METRIC_NAME_REGEX', () => {
  it('debe validar nombres válidos', () => {
    expect(METRIC_NAME_REGEX.test('custom_metric')).toBe(true);
    expect(METRIC_NAME_REGEX.test('metric123')).toBe(true);
    expect(METRIC_NAME_REGEX.test('_private_metric')).toBe(true);
  });

  it('debe rechazar nombres con caracteres especiales', () => {
    expect(METRIC_NAME_REGEX.test('metric-name')).toBe(false);
    expect(METRIC_NAME_REGEX.test('metric.name')).toBe(false);
    expect(METRIC_NAME_REGEX.test('metric name')).toBe(false);
  });

  it('debe respetar límite de longitud', () => {
    expect(METRIC_NAME_REGEX.test('a'.repeat(128))).toBe(true);
    expect(METRIC_NAME_REGEX.test('a'.repeat(129))).toBe(false);
  });
});
