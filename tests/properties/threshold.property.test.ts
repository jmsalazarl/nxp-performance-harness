import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { extractThresholds } from '../../src/services/extractThresholds';

const safeNameArb = fc.string({ minLength: 1, maxLength: 24 }).filter((value) => value.trim() !== '');
const thresholdMapArb = fc.dictionary(safeNameArb, fc.record({ ok: fc.boolean() }), { minKeys: 1, maxKeys: 5 });

describe('performance dashboard threshold properties', () => {
  it('maps threshold ok booleans exactly to passed booleans', () => {
    fc.assert(
      fc.property(safeNameArb, thresholdMapArb, (metricName, thresholds) => {
        const results = extractThresholds({ [metricName]: { thresholds } });

        for (const result of results) {
          expect(result.passed).toBe(thresholds[result.expression]?.ok);
        }
      }),
      { numRuns: 50 },
    );
  });

  it('preserves original metric names for every threshold result', () => {
    fc.assert(
      fc.property(safeNameArb, thresholdMapArb, (metricName, thresholds) => {
        const results = extractThresholds({ [metricName]: { thresholds } });

        expect(results.length).toBe(Object.keys(thresholds).length);
        for (const result of results) {
          expect(result.metric).toBe(metricName);
        }
      }),
      { numRuns: 50 },
    );
  });
});
