import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { normalize } from '../../src/services/normalize';
import { parseAndValidate } from '../../src/services/parseAndValidate';

const metricValuesArb = fc.record(
  {
    count: fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
    rate: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    avg: fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
    'p(95)': fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
    'p(99)': fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }),
  },
  { requiredKeys: [] },
);

const rawSummaryArb = fc.record({
  metrics: fc.dictionary(fc.string({ minLength: 1, maxLength: 24 }), fc.record({ values: metricValuesArb })),
});

describe('performance dashboard parse properties', () => {
  it('rejects malformed non-empty JSON as INVALID_JSON', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 80 }).filter((value) => {
          if (value.trim() === '') {
            return false;
          }

          try {
            JSON.parse(value);
            return false;
          } catch {
            return true;
          }
        }),
        (text) => {
          const result = parseAndValidate(text);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.type).toBe('INVALID_JSON');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('rejects JSON objects without metrics as MISSING_METRICS', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 16 }).filter((key) => key !== 'metrics'), fc.anything()),
        (objectWithoutMetrics) => {
          const result = parseAndValidate(JSON.stringify(objectWithoutMetrics));
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.type).toBe('MISSING_METRICS');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('normalization always returns initialized ReportModel fields for valid summaries', () => {
    fc.assert(
      fc.property(rawSummaryArb, fc.string({ minLength: 1, maxLength: 32 }), (rawSummary, fileName) => {
        const report = normalize(rawSummary, fileName);

        expect(report.fileName).toBe(fileName);
        expect(['loadtest', 'stresstest', 'capacitytest', 'stabilitytest', 'unknown']).toContain(report.testType);
        expect(Array.isArray(report.kpis)).toBe(true);
        expect(Array.isArray(report.thresholds)).toBe(true);
        expect(Array.isArray(report.charts)).toBe(true);
      }),
      { numRuns: 50 },
    );
  });
});
