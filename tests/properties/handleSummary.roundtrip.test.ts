import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { handleSummary } from "../helpers/handleSummary.js";

/**
 * Property 1: Round-trip de serialización del resumen
 *
 * For any objeto `data` válido de K6, al invocar `handleSummary(data)` y parsear
 * el contenido JSON del archivo de salida, el resultado DEBE ser deep-equal al
 * objeto `data` original.
 *
 * We use `toEqual` for deep comparison because JSON.parse always produces plain
 * objects (Object.prototype), which is the correct behavior for JSON serialization.
 * The property validates that the semantic content is preserved through the round-trip.
 *
 * **Validates: Requirements 1.3, 1.4, 4.1, 4.2, 4.3, 4.4**
 */
describe("Feature: k6-summary-export, Property 1: Round-trip de serialización del resumen", () => {
  /**
   * Arbitrary that generates JSON-safe objects with the K6 summary structure:
   * { metrics: { [key]: arbitrary JSON value }, root_group: arbitrary JSON value }
   *
   * Uses fc.jsonValue() which produces values that survive JSON round-trips.
   */
  const k6SummaryDataArb = fc.record({
    metrics: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.jsonValue()
    ),
    root_group: fc.jsonValue(),
  });

  it("JSON.parse(output[filename]) deep-equals original data", () => {
    fc.assert(
      fc.property(k6SummaryDataArb, (data) => {
        const testType = "loadtest";
        const result = handleSummary(data, testType);

        const filename = `reports/summary-${testType}.json`;
        const parsed = JSON.parse(result[filename]);

        // Compare JSON representations to avoid prototype issues
        // JSON serialization is the contract we're testing
        expect(JSON.stringify(parsed)).toBe(JSON.stringify(data));
      }),
      { numRuns: 100 }
    );
  });

  it("round-trip preserves metrics and root_group with arbitrary testType", () => {
    const arbWithTestType = fc.tuple(
      k6SummaryDataArb,
      fc.string({ minLength: 1, maxLength: 20 })
    );

    fc.assert(
      fc.property(arbWithTestType, ([data, testType]) => {
        const result = handleSummary(data, testType);

        const filename = `reports/summary-${testType}.json`;
        const parsed = JSON.parse(result[filename]);

        // Compare JSON representations to avoid prototype issues
        // JSON serialization is the contract we're testing
        expect(JSON.stringify(parsed)).toBe(JSON.stringify(data));
      }),
      { numRuns: 100 }
    );
  });
});
