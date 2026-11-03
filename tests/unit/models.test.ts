/**
 * Tests unitarios para las interfaces del modelo de datos
 * Verifica que las interfaces TypeScript están correctamente definidas
 */

import { describe, it, expect } from 'vitest';
import type {
  ReportModel,
  Kpi,
  KpiStatus,
  ThresholdResult,
  ChartSeries,
  TestType
} from '../../src/models/report';
import type { ParseError, ParseErrorType, Result } from '../../src/models/errors';
import { METRIC_MAPPINGS, type RawSummary } from '../../src/models/metrics';

describe('Modelos de datos - Definiciones TypeScript', () => {
  describe('report.ts - Interfaces principales', () => {
    it('debe permitir crear un Kpi válido', () => {
      const kpi: Kpi = {
        key: 'http_reqs',
        label: 'Total Requests',
        value: '1,234',
        unit: 'count',
        status: 'normal'
      };

      expect(kpi.key).toBe('http_reqs');
      expect(kpi.label).toBe('Total Requests');
      expect(kpi.value).toBe('1,234');
      expect(kpi.unit).toBe('count');
      expect(kpi.status).toBe('normal');
    });

    it('debe permitir todos los valores de KpiStatus', () => {
      const statuses: KpiStatus[] = ['normal', 'warning', 'critical'];
      
      statuses.forEach(status => {
        const kpi: Kpi = {
          key: 'test',
          label: 'Test',
          value: '100',
          unit: 'ms',
          status
        };
        expect(kpi.status).toBe(status);
      });
    });

    it('debe permitir crear un ThresholdResult válido', () => {
      const threshold: ThresholdResult = {
        metric: 'http_req_duration',
        expression: 'p(95)<500',
        passed: true
      };

      expect(threshold.metric).toBe('http_req_duration');
      expect(threshold.expression).toBe('p(95)<500');
      expect(threshold.passed).toBe(true);
    });

    it('debe permitir crear un ChartSeries válido', () => {
      const series: ChartSeries = {
        key: 'duration',
        label: 'Request Duration',
        values: [100, 200, 150, 300]
      };

      expect(series.key).toBe('duration');
      expect(series.label).toBe('Request Duration');
      expect(series.values).toEqual([100, 200, 150, 300]);
    });

    it('debe permitir todos los valores de TestType', () => {
      const types: TestType[] = ['loadtest', 'stresstest', 'capacitytest', 'stabilitytest', 'unknown'];
      
      types.forEach(type => {
        const testType: TestType = type;
        expect(testType).toBe(type);
      });
    });

    it('debe permitir crear un ReportModel completo', () => {
      const report: ReportModel = {
        fileName: 'loadtest-summary.json',
        testType: 'loadtest',
        kpis: [
          {
            key: 'http_reqs',
            label: 'Total Requests',
            value: '1,234',
            unit: 'count',
            status: 'normal'
          }
        ],
        thresholds: [
          {
            metric: 'http_req_duration',
            expression: 'p(95)<500',
            passed: true
          }
        ],
        charts: [
          {
            key: 'duration',
            label: 'Request Duration',
            values: [100, 200, 150]
          }
        ],
        rawSummary: { metrics: {} }
      };

      expect(report.fileName).toBe('loadtest-summary.json');
      expect(report.testType).toBe('loadtest');
      expect(report.kpis).toHaveLength(1);
      expect(report.thresholds).toHaveLength(1);
      expect(report.charts).toHaveLength(1);
      expect(report.rawSummary).toBeDefined();
    });
  });

  describe('errors.ts - Tipos de error', () => {
    it('debe permitir crear un ParseError con tipo INVALID_JSON', () => {
      const error: ParseError = {
        type: 'INVALID_JSON',
        message: 'El archivo no contiene JSON válido'
      };

      expect(error.type).toBe('INVALID_JSON');
      expect(error.message).toBe('El archivo no contiene JSON válido');
    });

    it('debe permitir crear un ParseError con tipo MISSING_METRICS', () => {
      const error: ParseError = {
        type: 'MISSING_METRICS',
        message: 'El JSON no contiene un objeto metrics'
      };

      expect(error.type).toBe('MISSING_METRICS');
      expect(error.message).toBe('El JSON no contiene un objeto metrics');
    });

    it('debe permitir crear un Result exitoso', () => {
      const success: Result<string, ParseError> = {
        ok: true,
        data: 'success value'
      };

      expect(success.ok).toBe(true);
      if (success.ok) {
        expect(success.data).toBe('success value');
      }
    });

    it('debe permitir crear un Result con error', () => {
      const failure: Result<string, ParseError> = {
        ok: false,
        error: {
          type: 'INVALID_JSON',
          message: 'Error de parsing'
        }
      };

      expect(failure.ok).toBe(false);
      if (!failure.ok) {
        expect(failure.error.type).toBe('INVALID_JSON');
        expect(failure.error.message).toBe('Error de parsing');
      }
    });
  });

  describe('metrics.ts - Mapeo de métricas', () => {
    it('debe exportar METRIC_MAPPINGS como array readonly', () => {
      expect(Array.isArray(METRIC_MAPPINGS)).toBe(true);
      expect(METRIC_MAPPINGS.length).toBeGreaterThan(0);
    });

    it('debe contener todas las métricas esperadas', () => {
      const expectedFields = [
        'Total requests',
        'Failed request rate',
        'Avg duration',
        'P95 duration',
        'P99 duration',
        'Avg waiting time',
        'Iterations',
        'Checks',
        'Retries'
      ];

      const actualFields = METRIC_MAPPINGS.map(m => m.dashboardField);
      
      expectedFields.forEach(field => {
        expect(actualFields).toContain(field);
      });
    });

    it('cada mapeo debe tener la estructura correcta', () => {
      METRIC_MAPPINGS.forEach(mapping => {
        expect(mapping).toHaveProperty('dashboardField');
        expect(mapping).toHaveProperty('path');
        expect(mapping).toHaveProperty('unit');
        expect(mapping).toHaveProperty('key');
        expect(mapping.path).toHaveProperty('primary');
        expect(typeof mapping.dashboardField).toBe('string');
        expect(typeof mapping.path.primary).toBe('string');
        expect(typeof mapping.unit).toBe('string');
        expect(typeof mapping.key).toBe('string');
      });
    });

    it('debe permitir crear un RawSummary válido', () => {
      const raw: RawSummary = {
        metrics: {
          http_reqs: { values: { count: 1234 } },
          http_req_duration: { values: { avg: 250 } }
        },
        otherField: 'value'
      };

      expect(raw.metrics).toBeDefined();
      expect(typeof raw.metrics).toBe('object');
    });
  });
});
