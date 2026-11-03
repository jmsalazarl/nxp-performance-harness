import { describe, expect, it, vi } from 'vitest';
import { exportHtml } from '../../src/services/exportHtml';
import { normalize } from '../../src/services/normalize';
import { parseAndValidate } from '../../src/services/parseAndValidate';

describe('performance dashboard pipeline', () => {
  it('parses, normalizes and exports a K6 summary without network APIs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const xhrSpy = vi.spyOn(globalThis, 'XMLHttpRequest');
    const webSocketSpy = vi.spyOn(globalThis, 'WebSocket');

    const parsed = parseAndValidate(JSON.stringify({
      metrics: {
        http_reqs: { values: { count: 500 } },
        http_req_failed: { values: { rate: 0.02 } },
        http_req_duration: {
          values: { avg: 120, 'p(95)': 240, 'p(99)': 360 },
          thresholds: { 'p(95)<500': { ok: true } },
        },
        iterations: { values: { count: 80 } },
      },
    }));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const report = normalize(parsed.data, 'daily-stresstest-summary.json');
    const html = exportHtml(report);

    expect(report.testType).toBe('stresstest');
    expect(report.kpis.find((kpi) => kpi.key === 'http_reqs')?.value).toBe('500');
    expect(report.thresholds[0]).toEqual({
      metric: 'http_req_duration',
      expression: 'p(95)<500',
      passed: true,
    });
    expect(html).toContain('daily-stresstest-summary.json');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();
  });
});
