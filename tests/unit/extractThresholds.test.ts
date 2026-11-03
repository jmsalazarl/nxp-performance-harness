import { describe, it, expect } from "vitest";
import { extractThresholds } from "../../src/services/extractThresholds";

/**
 * Unit tests para extractThresholds
 * Validates: Requirements 3.1-3.5
 */
describe("extractThresholds", () => {
  it("debe extraer thresholds correctamente cuando están presentes", () => {
    const metrics = {
      http_req_duration: {
        type: "trend",
        thresholds: {
          "p(95) < 500": { ok: true },
          "p(99) < 1000": { ok: false },
        },
      },
      http_req_failed: {
        type: "rate",
        thresholds: {
          "rate < 0.01": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { metric: "http_req_duration", expression: "p(95) < 500", passed: true },
      { metric: "http_req_duration", expression: "p(99) < 1000", passed: false },
      { metric: "http_req_failed", expression: "rate < 0.01", passed: true },
    ]);
  });

  it("debe retornar array vacío cuando no hay thresholds", () => {
    const metrics = {
      http_req_duration: {
        type: "trend",
        values: { avg: 123.45 },
      },
      http_req_failed: {
        type: "rate",
        values: { rate: 0.02 },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toEqual([]);
  });

  it("debe retornar array vacío cuando metrics está vacío", () => {
    const metrics = {};

    const result = extractThresholds(metrics);

    expect(result).toEqual([]);
  });

  it("debe mapear ok: true a passed: true", () => {
    const metrics = {
      test_metric: {
        thresholds: {
          "value > 100": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(true);
  });

  it("debe mapear ok: false a passed: false", () => {
    const metrics = {
      test_metric: {
        thresholds: {
          "value > 100": { ok: false },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].passed).toBe(false);
  });

  it("debe preservar el nombre de la métrica en el resultado", () => {
    const metrics = {
      custom_metric_name: {
        thresholds: {
          "expression": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].metric).toBe("custom_metric_name");
  });

  it("debe preservar la expresión del threshold en el resultado", () => {
    const metrics = {
      http_req_duration: {
        thresholds: {
          "p(95) < 500 && p(99) < 1000": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].expression).toBe("p(95) < 500 && p(99) < 1000");
  });

  it("debe manejar métricas con thresholds vacío", () => {
    const metrics = {
      http_req_duration: {
        thresholds: {},
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toEqual([]);
  });

  it("debe ignorar métricas sin propiedad thresholds", () => {
    const metrics = {
      http_req_duration: {
        type: "trend",
        values: { avg: 123.45 },
      },
      http_req_failed: {
        type: "rate",
        thresholds: {
          "rate < 0.01": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].metric).toBe("http_req_failed");
  });

  it("debe manejar thresholds sin propiedad ok", () => {
    const metrics = {
      http_req_duration: {
        thresholds: {
          "p(95) < 500": { someOtherProp: "value" },
        },
      },
    };

    const result = extractThresholds(metrics);

    // Debe ignorar thresholds que no tienen propiedad 'ok'
    expect(result).toEqual([]);
  });

  it("debe manejar valores null o undefined en metricData", () => {
    const metrics = {
      metric1: null,
      metric2: undefined,
      metric3: {
        thresholds: {
          "expr": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(1);
    expect(result[0].metric).toBe("metric3");
  });

  it("debe manejar thresholds que no son objetos", () => {
    const metrics = {
      http_req_duration: {
        thresholds: "not an object",
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toEqual([]);
  });

  it("debe manejar múltiples thresholds en múltiples métricas", () => {
    const metrics = {
      metric1: {
        thresholds: {
          "expr1": { ok: true },
          "expr2": { ok: false },
        },
      },
      metric2: {
        thresholds: {
          "expr3": { ok: true },
        },
      },
      metric3: {
        thresholds: {
          "expr4": { ok: false },
          "expr5": { ok: true },
        },
      },
    };

    const result = extractThresholds(metrics);

    expect(result).toHaveLength(5);
    expect(result.filter(r => r.passed).length).toBe(3);
    expect(result.filter(r => !r.passed).length).toBe(2);
  });
});
