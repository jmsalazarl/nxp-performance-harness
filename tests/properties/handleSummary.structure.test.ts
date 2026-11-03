import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { handleSummary } from "../helpers/handleSummary.js";

/**
 * Property 2: Estructura del output map
 *
 * For any objeto `data` y cualquier valor de `TEST_TYPE`, el mapa retornado por
 * `handleSummary(data)` DEBE contener exactamente dos claves: una con formato
 * `reports/summary-{testType}.json` y otra con valor `stdout`.
 *
 * **Validates: Requirements 1.2, 5.1**
 */
describe("Feature: k6-summary-export, Property 2: Estructura del output map", () => {
  /**
   * Arbitrary that generates arbitrary data objects (JSON-compatible)
   * to represent any possible K6 summary data.
   */
  const arbitraryData = fc.jsonValue();

  /**
   * Arbitrary that generates arbitrary strings to represent any possible testType.
   */
  const arbitraryTestType = fc.string({ minLength: 1, maxLength: 50 });

  it("output map contiene exactamente 2 claves: reports/summary-{testType}.json y stdout", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbitraryData, arbitraryTestType),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // Verificar que el mapa tiene exactamente 2 claves
          const keys = Object.keys(result);
          expect(keys).toHaveLength(2);

          // Verificar que las claves son las esperadas
          const expectedFilename = `reports/summary-${testType}.json`;
          expect(keys).toContain(expectedFilename);
          expect(keys).toContain("stdout");

          // Verificar que ambos valores son strings
          expect(typeof result[expectedFilename]).toBe("string");
          expect(typeof result.stdout).toBe("string");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("output map estructura permanece constante con data complejo", () => {
    // Generar objetos más complejos que simulan la estructura K6
    const k6LikeData = fc.record({
      metrics: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.record({
          type: fc.constantFrom("trend", "counter", "gauge", "rate"),
          contains: fc.constantFrom("time", "default"),
          values: fc.dictionary(fc.string(), fc.float()),
        })
      ),
      root_group: fc.record({
        name: fc.string(),
        path: fc.string(),
        id: fc.string(),
        groups: fc.array(fc.jsonValue()),
        checks: fc.array(fc.jsonValue()),
      }),
    });

    fc.assert(
      fc.property(
        fc.tuple(k6LikeData, arbitraryTestType),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // La estructura debe ser idéntica independientemente de la complejidad del data
          const keys = Object.keys(result);
          expect(keys).toHaveLength(2);

          const expectedFilename = `reports/summary-${testType}.json`;
          expect(result).toHaveProperty(expectedFilename);
          expect(result).toHaveProperty("stdout");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("output map estructura no se ve afectada por testType vacío o con caracteres especiales", () => {
    // Probar con strings que incluyen caracteres especiales
    const specialTestTypes = fc.constantFrom(
      "load-test",
      "stress_test",
      "capacity.test",
      "test@123",
      "тест", // caracteres Unicode
      "测试",
      "テスト"
    );

    fc.assert(
      fc.property(fc.tuple(arbitraryData, specialTestTypes), ([data, testType]) => {
        const result = handleSummary(data, testType);

        const keys = Object.keys(result);
        expect(keys).toHaveLength(2);

        const expectedFilename = `reports/summary-${testType}.json`;
        expect(keys).toContain(expectedFilename);
        expect(keys).toContain("stdout");
      }),
      { numRuns: 100 }
    );
  });
});
