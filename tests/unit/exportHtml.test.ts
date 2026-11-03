import { describe, expect, it } from 'vitest';
import { exportHtml } from '../../src/services/exportHtml';
import { ReportModel } from '../../src/models/report';

const model: ReportModel = {
  fileName: 'summary-loadtest.json',
  testType: 'loadtest',
  kpis: [
    { key: 'http_reqs', label: 'Total requests', value: '100', unit: 'count', status: 'normal' },
  ],
  thresholds: [
    { metric: 'http_req_duration', expression: 'p(95)<500', passed: true },
  ],
  charts: [
    { key: 'http_req_duration', label: 'Duration', values: [100, 200] },
  ],
  rawSummary: { metrics: {} },
};

describe('exportHtml', () => {
  it('generates standalone HTML with embedded report data', () => {
    const html = exportHtml(model);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('id="report-data"');
    expect(html).toContain('summary-loadtest.json');
    expect(html).toContain('Reporte de rendimiento K6');
    expect(html).toContain('<html lang="es">');
  });

  it('escapes embedded JSON so script tags cannot break out', () => {
    const html = exportHtml({
      ...model,
      fileName: '</script><script>alert(1)</script>.json',
    });

    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});
