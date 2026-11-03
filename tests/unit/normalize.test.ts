import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/services/normalize';

describe('normalize', () => {
  it('builds a complete report model from raw K6 summary data', () => {
    const report = normalize(
      {
        metrics: {
          http_reqs: { values: { count: 120 } },
          http_req_failed: { values: { rate: 0.05 } },
          http_req_duration: {
            values: { avg: 100, 'p(95)': 220, 'p(99)': 330 },
            thresholds: { 'p(95)<500': { ok: true } },
          },
          iterations: { values: { count: 30 } },
        },
      },
      'nightly-loadtest-summary.json',
    );

    expect(report.fileName).toBe('nightly-loadtest-summary.json');
    expect(report.testType).toBe('loadtest');
    expect(report.kpis).toHaveLength(9);
    expect(report.thresholds).toEqual([
      { metric: 'http_req_duration', expression: 'p(95)<500', passed: true },
    ]);
    expect(report.charts.map((chart) => chart.key)).toContain('http_req_duration');
    expect(report.rawSummary.metrics).toBeDefined();
  });
});
