import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { extractKpis } from '../../src/services/extractKpis';

describe('performance dashboard KPI properties', () => {
  it('extracts present KPI values from their expected metric paths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 60_000, noNaN: true, noDefaultInfinity: true }),
        (requestCount, failedRate, avgDuration) => {
          const kpis = extractKpis({
            http_reqs: { values: { count: requestCount } },
            http_req_failed: { values: { rate: failedRate } },
            http_req_duration: { values: { avg: avgDuration } },
          });

          expect(kpis.find((kpi) => kpi.key === 'http_reqs')?.value).toBe(requestCount.toLocaleString('en-US'));
          expect(kpis.find((kpi) => kpi.key === 'http_req_failed')?.value).toBe((failedRate * 100).toFixed(2));
          expect(kpis.find((kpi) => kpi.key === 'http_req_duration_avg')?.value).toBe(avgDuration.toFixed(2));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('degrades missing KPI metrics to N/A without throwing', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.anything()), (metrics) => {
        const kpis = extractKpis(metrics);

        expect(kpis).toHaveLength(9);
        for (const kpi of kpis) {
          expect(typeof kpi.value).toBe('string');
        }
      }),
      { numRuns: 50 },
    );
  });
});
