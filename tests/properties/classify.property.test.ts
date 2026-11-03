import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { classifyTestType } from '../../src/services/classifyTestType';
import { TestType } from '../../src/models/report';

const keywords: Exclude<TestType, 'unknown'>[] = ['loadtest', 'stresstest', 'capacitytest', 'stabilitytest'];

function hasKeyword(value: string): boolean {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

describe('performance dashboard classification properties', () => {
  it('classifies filenames with exactly one known keyword', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...keywords),
        fc.string({ maxLength: 12 }).filter((value) => !hasKeyword(value)),
        fc.string({ maxLength: 12 }).filter((value) => !hasKeyword(value)),
        (keyword, prefix, suffix) => {
          expect(classifyTestType(`${prefix}${keyword}${suffix}.json`)).toBe(keyword);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('returns unknown for filenames without known keywords', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }).filter((value) => !hasKeyword(value)), (fileName) => {
        expect(classifyTestType(fileName)).toBe('unknown');
      }),
      { numRuns: 50 },
    );
  });
});
