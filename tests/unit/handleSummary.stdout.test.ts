import { describe, it, expect } from "vitest";
import { handleSummary } from "../helpers/handleSummary";

/**
 * Unit tests para verificar el formato y estructura del stdout.
 * Validates: Requirements 5.1, 5.2, 5.3
 */
describe("handleSummary - formato stdout", () => {
  const sampleData = {
    metrics: {
      http_req_duration: {
        type: "trend",
        contains: "time",
        values: { avg: 123.45, p95: 200.0 },
        thresholds: { "p(95) < 2000": { ok: true } },
      },
      http_req_failed: {
        type: "rate",
        contains: "default",
        values: { rate: 0.02, passes: 98, fails: 2 },
      },
      waiting_time: {
        type: "trend",
        contains: "time",
        values: { avg: 50.0, min: 10.0, max: 200.0 },
      },
    },
    root_group: { name: "", path: "", id: "", groups: [], checks: [] },
  };

  it("el contenido de stdout es JSON parseable", () => {
    const result = handleSummary(sampleData, "loadtest");
    expect(result).toHaveProperty("stdout");

    // Verificar que el stdout es un string JSON válido
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("stdout contiene test_type como string", () => {
    const result = handleSummary(sampleData, "loadtest");
    const stdoutParsed = JSON.parse(result.stdout);

    expect(stdoutParsed).toHaveProperty("test_type");
    expect(typeof stdoutParsed.test_type).toBe("string");
    expect(stdoutParsed.test_type).toBe("loadtest");
  });

  it("stdout contiene metrics como array de strings", () => {
    const result = handleSummary(sampleData, "stresstest");
    const stdoutParsed = JSON.parse(result.stdout);

    expect(stdoutParsed).toHaveProperty("metrics");
    expect(Array.isArray(stdoutParsed.metrics)).toBe(true);

    // Verificar que todos los elementos son strings
    stdoutParsed.metrics.forEach((metric: unknown) => {
      expect(typeof metric).toBe("string");
    });
  });

  it("metrics en stdout contiene los nombres correctos de las métricas", () => {
    const result = handleSummary(sampleData, "capacitytest");
    const stdoutParsed = JSON.parse(result.stdout);

    const expectedMetrics = ["http_req_duration", "http_req_failed", "waiting_time"];
    expect(stdoutParsed.metrics).toEqual(expect.arrayContaining(expectedMetrics));
    expect(stdoutParsed.metrics.length).toBe(expectedMetrics.length);
  });

  it("stdout es más conciso que el archivo JSON completo", () => {
    const result = handleSummary(sampleData, "loadtest");

    const fileContent = result["reports/summary-loadtest.json"];
    const stdoutContent = result.stdout;

    expect(stdoutContent.length).toBeLessThan(fileContent.length);
  });

  it("stdout maneja correctamente data sin métricas", () => {
    const dataWithoutMetrics = {
      root_group: { name: "", path: "", id: "", groups: [], checks: [] },
    };

    const result = handleSummary(dataWithoutMetrics, "loadtest");
    const stdoutParsed = JSON.parse(result.stdout);

    expect(stdoutParsed.test_type).toBe("loadtest");
    expect(stdoutParsed.metrics).toEqual([]);
  });

  it("stdout maneja correctamente métricas vacías", () => {
    const dataWithEmptyMetrics = {
      metrics: {},
      root_group: { name: "", path: "", id: "", groups: [], checks: [] },
    };

    const result = handleSummary(dataWithEmptyMetrics, "stabilitytest");
    const stdoutParsed = JSON.parse(result.stdout);

    expect(stdoutParsed.test_type).toBe("stabilitytest");
    expect(stdoutParsed.metrics).toEqual([]);
  });
});
