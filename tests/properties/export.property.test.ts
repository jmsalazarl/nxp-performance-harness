import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ReportModel, TestType } from '../../src/models/report';
import { exportHtml } from '../../src/services/exportHtml';

const testTypeArb = fc.constantFrom<TestType>('loadtest', 'stresstest', 'capacitytest', 'stabilitytest', 'unknown');

const reportArb: fc.Arbitrary<ReportModel> = fc.record({
  fileName: fc.string({ minLength: 1, maxLength: 40 }),
  testType: testTypeArb,
  kpis: fc.array(
    fc.record({
      key: fc.string({ minLength: 1, maxLength: 16 }),
      label: fc.string({ minLength: 1, maxLength: 24 }),
      value: fc.string({ minLength: 1, maxLength: 16 }),
      unit: fc.string({ maxLength: 10 }),
      status: fc.constantFrom('normal', 'warning', 'critical'),
    }),
    { maxLength: 8 },
  ),
  thresholds: fc.array(
    fc.record({
      metric: fc.string({ minLength: 1, maxLength: 16 }),
      expression: fc.string({ minLength: 1, maxLength: 24 }),
      passed: fc.boolean(),
    }),
    { maxLength: 8 },
  ),
  charts: fc.array(
    fc.record({
      key: fc.string({ minLength: 1, maxLength: 16 }),
      label: fc.string({ minLength: 1, maxLength: 24 }),
      values: fc.array(fc.double({ min: 0, max: 10_000, noNaN: true, noDefaultInfinity: true }), { maxLength: 5 }),
    }),
    { maxLength: 5 },
  ),
  rawSummary: fc.record({ metrics: fc.constant({}) }),
});

describe('performance dashboard export properties', () => {
  it('embeds report data that can be reconstituted from the HTML', () => {
    fc.assert(
      fc.property(reportArb, (report) => {
        const html = exportHtml(report);
        const match = html.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/);

        expect(match).not.toBeNull();
        const embedded = JSON.parse(match?.[1] ?? '{}') as ReportModel;
        expect(embedded).toEqual(report);
      }),
      { numRuns: 50 },
    );
  });
});
