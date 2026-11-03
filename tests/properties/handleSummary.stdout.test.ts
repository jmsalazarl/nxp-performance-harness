import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { handleSummary } from "../helpers/handleSummary.js";

/**
 * Property 4: Stdout contiene metadatos del resumen
 *
 * For any objeto `data` con un campo `metrics`, el contenido de `stdout` parseado
 * como JSON DEBE contener las claves `test_type` (string) y `metrics` (array de
 * strings con los nombres de las métricas presentes en `data.metrics`).
 *
 * **Validates: Requirements 5.2**
 */
describe("Feature: k6-summary-export, Property 4: Stdout contiene metadatos del resumen", () => {
  /**
   * Arbitrary that generates objects with varying numbers of metrics (0 to N).
   * Each metric key is a non-empty string, and the value is arbitrary JSON.
   */
  const dataWithMetricsArb = fc.record({
    metrics: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.jsonValue(),
      { minKeys: 0, maxKeys: 20 }
    ),
  });

  /**
   * Arbitrary for test type strings.
   */
  const testTypeArb = fc.string({ minLength: 1, maxLength: 30 });

  it("stdout parseado contiene test_type (string) y metrics (array)", () => {
    fc.assert(
      fc.property(
        fc.tuple(dataWithMetricsArb, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // Parsear stdout como JSON
          const stdoutParsed = JSON.parse(result.stdout);

          // Verificar que contiene test_type como string
          expect(stdoutParsed).toHaveProperty("test_type");
          expect(typeof stdoutParsed.test_type).toBe("string");
          expect(stdoutParsed.test_type).toBe(testType);

          // Verificar que contiene metrics como array
          expect(stdoutParsed).toHaveProperty("metrics");
          expect(Array.isArray(stdoutParsed.metrics)).toBe(true);

          // Verificar que todos los elementos de metrics son strings
          stdoutParsed.metrics.forEach((metric: unknown) => {
            expect(typeof metric).toBe("string");
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stdout metrics array contiene exactamente los nombres de las métricas del data", () => {
    fc.assert(
      fc.property(
        fc.tuple(dataWithMetricsArb, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          // Parsear stdout como JSON
          const stdoutParsed = JSON.parse(result.stdout);

          // Obtener los nombres de métricas esperados del data original
          const expectedMetricNames = Object.keys(data.metrics || {});

          // Verificar que el array de metrics coincide con los nombres esperados
          expect(stdoutParsed.metrics).toEqual(expectedMetricNames);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stdout metrics array está vacío cuando data.metrics está vacío", () => {
    fc.assert(
      fc.property(testTypeArb, (testType) => {
        const dataWithEmptyMetrics = { metrics: {} };
        const result = handleSummary(dataWithEmptyMetrics, testType);

        const stdoutParsed = JSON.parse(result.stdout);

        expect(stdoutParsed.metrics).toEqual([]);
        expect(stdoutParsed.metrics).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it("stdout metrics array contiene N elementos cuando data.metrics tiene N métricas", () => {
    fc.assert(
      fc.property(
        fc.tuple(dataWithMetricsArb, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          const stdoutParsed = JSON.parse(result.stdout);
          const expectedCount = Object.keys(data.metrics || {}).length;

          expect(stdoutParsed.metrics).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stdout metrics preserva el orden de las claves del objeto data.metrics", () => {
    fc.assert(
      fc.property(
        fc.tuple(dataWithMetricsArb, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          const stdoutParsed = JSON.parse(result.stdout);
          const expectedOrder = Object.keys(data.metrics || {});

          // En JavaScript, Object.keys() mantiene el orden de inserción para
          // propiedades de string (desde ES2015+)
          expect(stdoutParsed.metrics).toEqual(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stdout contiene solo test_type y metrics, sin claves adicionales", () => {
    fc.assert(
      fc.property(
        fc.tuple(dataWithMetricsArb, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          const stdoutParsed = JSON.parse(result.stdout);
          const keys = Object.keys(stdoutParsed);

          // Verificar que contiene exactamente 2 claves
          expect(keys).toHaveLength(2);
          expect(keys).toContain("test_type");
          expect(keys).toContain("metrics");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stdout metrics contiene nombres correctos con caracteres especiales", () => {
    // Probar con nombres de métricas que incluyen caracteres especiales
    const dataWithSpecialMetricNames = fc.record({
      metrics: fc.dictionary(
        fc.constantFrom(
          "http_req_duration",
          "http_req_failed",
          "waiting_time",
          "Errors",
          "Total_Reqs",
          "retries",
          "transaction_duration",
          "transactions_per_second",
          "active_vus",
          "metric-with-dash",
          "metric.with.dot",
          "métrica_unicode",
          "指标_unicode"
        ),
        fc.jsonValue(),
        { minKeys: 0, maxKeys: 10 }
      ),
    });

    fc.assert(
      fc.property(
        fc.tuple(dataWithSpecialMetricNames, testTypeArb),
        ([data, testType]) => {
          const result = handleSummary(data, testType);

          const stdoutParsed = JSON.parse(result.stdout);
          const expectedMetricNames = Object.keys(data.metrics || {});

          expect(stdoutParsed.metrics).toEqual(expectedMetricNames);
        }
      ),
      { numRuns: 100 }
    );
  });
});
