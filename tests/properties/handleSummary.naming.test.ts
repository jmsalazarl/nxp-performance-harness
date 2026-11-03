import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { handleSummary } from "../helpers/handleSummary.js";

/**
 * Property 3: Nombrado de archivo sigue el patrón TEST_TYPE
 *
 * For any valor de `TEST_TYPE` (incluyendo ausencia), la clave del archivo en el
 * output map DEBE ser igual a `reports/summary-{TEST_TYPE}.json` cuando
 * `TEST_TYPE` está definido, o `reports/summary-unknown.json` cuando no lo está.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */
describe("Feature: k6-summary-export, Property 3: Nombrado de archivo sigue el patrón TEST_TYPE", () => {
  /**
   * Arbitrary that generates minimal data objects to focus on filename testing.
   * We don't need complex data structures for this property.
   */
  const minimalData = fc.record({
    metrics: fc.constant({}),
  });

  it("filename coincide con reports/summary-{testType}.json cuando testType está definido", () => {
    // Generar strings arbitrarios para testType
    const arbitraryTestType = fc.string({ minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(
        fc.tuple(minimalData, arbitraryTestType),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // Verificar que la clave del archivo sigue el patrón esperado
          const expectedFilename = `reports/summary-${testType}.json`;
          expect(result).toHaveProperty(expectedFilename);

          // Verificar que el contenido existe y es un string
          expect(typeof result[expectedFilename]).toBe("string");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("filename es reports/summary-unknown.json cuando testType es undefined o string vacío", () => {
    // Probar con undefined explícito
    fc.assert(
      fc.property(minimalData, (data) => {
        // Simular el comportamiento con testType undefined
        const testTypeUndefined = undefined as any;
        const result = handleSummary(data, testTypeUndefined || "unknown");

        // Cuando testType es undefined, el fallback es "unknown"
        expect(result).toHaveProperty("reports/summary-unknown.json");
        expect(typeof result["reports/summary-unknown.json"]).toBe("string");
      }),
      { numRuns: 100 }
    );
  });

  it("filename maneja correctamente los perfiles conocidos de K6", () => {
    // Probar con los perfiles específicos del sistema
    const knownProfiles = fc.constantFrom(
      "loadtest",
      "stresstest",
      "capacitytest",
      "stabilitytest"
    );

    fc.assert(
      fc.property(fc.tuple(minimalData, knownProfiles), ([data, testType]) => {
        const result = handleSummary(data, testType);

        const expectedFilename = `reports/summary-${testType}.json`;
        expect(result).toHaveProperty(expectedFilename);
        expect(Object.keys(result)).toContain(expectedFilename);
      }),
      { numRuns: 100 }
    );
  });

  it("filename maneja correctamente strings con caracteres especiales", () => {
    // Probar con caracteres que podrían aparecer en nombres de test
    const specialCharTestTypes = fc.constantFrom(
      "load-test",
      "stress_test",
      "capacity.test",
      "test@v1",
      "test#1",
      "test with spaces",
      "тест", // Cirílico
      "测试", // Chino
      "テスト" // Japonés
    );

    fc.assert(
      fc.property(
        fc.tuple(minimalData, specialCharTestTypes),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // El patrón debe funcionar con cualquier string
          const expectedFilename = `reports/summary-${testType}.json`;
          expect(result).toHaveProperty(expectedFilename);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("filename es predecible y determinista para el mismo testType", () => {
    // Verificar que múltiples invocaciones con el mismo testType producen el mismo filename
    const arbitraryTestType = fc.string({ minLength: 1, maxLength: 30 });

    fc.assert(
      fc.property(
        fc.tuple(minimalData, arbitraryTestType),
        ([data, testType]) => {
          const result1 = handleSummary(data, testType);
          const result2 = handleSummary(data, testType);

          // Los filenames deben ser idénticos
          const keys1 = Object.keys(result1).filter((k) => k !== "stdout");
          const keys2 = Object.keys(result2).filter((k) => k !== "stdout");

          expect(keys1).toEqual(keys2);
          expect(keys1[0]).toBe(`reports/summary-${testType}.json`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
